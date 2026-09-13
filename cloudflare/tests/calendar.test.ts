import {expect,it} from "vitest";
import {lastClosedHfWeek} from "../src/calendar";
it("selects the closed HF Sunday-Saturday week on Monday KST",()=>{
 expect(lastClosedHfWeek(new Date("2026-09-14T00:00:00Z"))).toBe("2026-W37");
 expect(lastClosedHfWeek(new Date("2026-09-14T09:00:00Z"))).toBe("2026-W37");
 expect(lastClosedHfWeek(new Date("2026-09-12T23:59:59Z"))).toBe("2026-W36");
 expect(lastClosedHfWeek(new Date("2026-09-13T00:00:00Z"))).toBe("2026-W37");
});
it("handles the HF week-year boundary rather than ISO Monday weeks",()=>{
 expect(lastClosedHfWeek(new Date("2021-01-04T00:00:00Z"))).toBe("2021-W01");
 expect(lastClosedHfWeek(new Date("2025-01-06T00:00:00Z"))).toBe("2025-W01");
});
