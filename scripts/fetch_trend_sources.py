from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
import time
from typing import Final
from urllib import error, parse, request
import xml.etree.ElementTree as ET


ARXIV_API_URL: Final[str] = "https://export.arxiv.org/api/query"
ARXIV_RSS_URL: Final[str] = "https://rss.arxiv.org/rss"
ATOM_NS: Final[dict[str, str]] = {"atom": "http://www.w3.org/2005/Atom"}
RSS_CATEGORY_MAP: Final[dict[str, list[str]]] = {
    "llm": ["cs.CL", "cs.AI"],
    "detection-segmentation": ["cs.CV"],
    "vision-language": ["cs.CV", "cs.CL", "cs.AI"],
}
RSS_KEYWORDS_MAP: Final[dict[str, list[str]]] = {
    "llm": ["llm", "language model", "alignment", "agent", "reasoning", "instruction"],
    "detection-segmentation": ["detection", "segmentation", "instance", "panoptic", "mask"],
    "vision-language": ["vision-language", "image-text", "multimodal", "caption", "vlm"],
}
TRACK_QUERY_MAP: Final[dict[str, str]] = {
    "llm": "(cat:cs.CL OR cat:cs.AI) AND (all:llm OR all:instruction OR all:alignment OR all:agent OR all:reasoning)",
    "detection-segmentation": "cat:cs.CV AND (all:detection OR all:segmentation OR all:instance OR all:panoptic)",
    "vision-language": "(cat:cs.CV OR cat:cs.CL OR cat:cs.AI) AND (all:vision-language OR all:image-text OR all:captioning OR all:multimodal OR all:vlm)",
    "nlp": "(cat:cs.CL OR cat:cs.AI) AND (all:language OR all:llm OR all:translation OR all:reasoning)",
    "cv": "cat:cs.CV AND (all:vision OR all:detection OR all:segmentation OR all:diffusion)",
    "multimodal": "(cat:cs.CV OR cat:cs.CL OR cat:cs.AI) AND (all:multimodal OR all:vision-language OR all:text-image OR all:video-language)",
    "dl-basics": "cat:cs.LG",
}


@dataclass(slots=True)
class TrendSource:
    title: str
    url: str
    published_at: str
    source_type: str


def build_arxiv_url(track: str, max_results: int) -> str:
    query = TRACK_QUERY_MAP.get(track, f"all:{track}")
    params = {
        "search_query": query,
        "sortBy": "submittedDate",
        "sortOrder": "descending",
        "start": 0,
        "max_results": max_results,
    }
    return f"{ARXIV_API_URL}?{parse.urlencode(params)}"


def parse_arxiv_feed(xml_text: str) -> list[TrendSource]:
    root = ET.fromstring(xml_text)
    sources: list[TrendSource] = []
    for entry in root.findall("atom:entry", ATOM_NS):
        title = (entry.findtext("atom:title", default="", namespaces=ATOM_NS) or "").strip()
        published_raw = (entry.findtext("atom:published", default="", namespaces=ATOM_NS) or "").strip()
        html_url = ""
        for link in entry.findall("atom:link", ATOM_NS):
            if link.attrib.get("rel") == "alternate":
                html_url = link.attrib.get("href", "")
                break

        if not title or not html_url:
            continue

        published_at = published_raw[:10] if published_raw else datetime.now(UTC).date().isoformat()
        sources.append(
            TrendSource(
                title=title.replace("\n", " ").strip(),
                url=html_url,
                published_at=published_at,
                source_type="paper",
            )
        )
    return sources


def parse_arxiv_rss(xml_text: str, keywords: list[str]) -> list[TrendSource]:
    root = ET.fromstring(xml_text)
    channel = root.find("channel")
    if channel is None:
        return []

    sources: list[TrendSource] = []
    keyword_set = [keyword.lower() for keyword in keywords]
    for item in channel.findall("item"):
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        description = (item.findtext("description") or "").strip()
        if not title or not link:
            continue

        haystack = f"{title}\n{description}".lower()
        if keyword_set and not any(keyword in haystack for keyword in keyword_set):
            continue

        pub_date_raw = (item.findtext("pubDate") or "").strip()
        try:
            published_at = parsedate_to_datetime(pub_date_raw).date().isoformat() if pub_date_raw else datetime.now(UTC).date().isoformat()
        except Exception:
            published_at = datetime.now(UTC).date().isoformat()

        sources.append(
            TrendSource(
                title=title,
                url=link,
                published_at=published_at,
                source_type="paper",
            )
        )
    return sources


def fetch_trend_sources_from_rss(track: str, max_results: int) -> list[dict[str, str]]:
    categories = RSS_CATEGORY_MAP.get(track, [])
    keywords = RSS_KEYWORDS_MAP.get(track, [])
    if not categories:
        raise RuntimeError(f"No RSS fallback categories configured for track={track}")

    dedup: dict[str, TrendSource] = {}
    for category in categories:
        rss_url = f"{ARXIV_RSS_URL}/{category}"
        rss_request = request.Request(
            rss_url,
            headers={"User-Agent": "Discord-Bot/1.0 (GitHub Actions trend fetch fallback)"},
        )
        with request.urlopen(rss_request, timeout=60) as response:
            xml_text = response.read().decode("utf-8")
        for source in parse_arxiv_rss(xml_text, keywords):
            dedup[source.url] = source

    sources = list(dedup.values())[:max_results]
    if not sources:
        raise RuntimeError(f"No trend sources fetched from RSS fallback for track={track}")
    return [
        {
            "title": source.title,
            "url": source.url,
            "published_at": source.published_at,
            "source_type": source.source_type,
        }
        for source in sources
    ]


def fetch_trend_sources(track: str, max_results: int = 5) -> list[dict[str, str]]:
    api_url = build_arxiv_url(track, max_results)
    http_request = request.Request(
        api_url,
        headers={
            "User-Agent": "Discord-Bot/1.0 (GitHub Actions trend fetch)",
        },
    )
    xml_text = ""
    rate_limited = False
    for attempt in range(1, 4):
        try:
            with request.urlopen(http_request, timeout=60) as response:
                xml_text = response.read().decode("utf-8")
                break
        except error.HTTPError as exc:
            if exc.code == 429 and attempt < 4:
                rate_limited = True
                retry_after = exc.headers.get("Retry-After")
                delay = int(retry_after) if retry_after and retry_after.isdigit() else attempt * 10
                time.sleep(delay)
                continue
            if exc.code == 429:
                rate_limited = True
                break
            raise RuntimeError(f"Trend source fetch failed with HTTP {exc.code}.") from exc
    if not xml_text:
        if rate_limited:
            return fetch_trend_sources_from_rss(track, max_results)
        raise RuntimeError(f"Trend source fetch failed for track={track}")

    sources = parse_arxiv_feed(xml_text)
    if not sources:
        raise RuntimeError(f"No trend sources fetched for track={track}")
    return [
        {
            "title": source.title,
            "url": source.url,
            "published_at": source.published_at,
            "source_type": source.source_type,
        }
        for source in sources
    ]
