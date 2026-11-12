import { describe, expect, test } from "bun:test";
import { getPointLocation, parsePointCoordinates } from "./point-location";

describe("point coordinates", () => {
  test("accepts decimal commas and zero coordinates", () => {
    expect(parsePointCoordinates("49,123456", "24,123456")).toEqual({ lat: 49.123456, lng: 24.123456 });
    expect(parsePointCoordinates("0", "0")).toEqual({ lat: 0, lng: 0 });
  });
  test("rejects partial, invalid and out-of-range coordinates", () => {
    for (const [lat, lng] of [["49", ""], ["abc", "24"], ["91", "24"], ["49", "181"]]) {
      expect(() => parsePointCoordinates(lat, lng)).toThrow();
    }
  });
  test("retries unavailable GPS with lower accuracy, but never retries denial", async () => {
    const calls: boolean[] = [];
    Object.defineProperty(globalThis, "window", { configurable: true, value: { isSecureContext: true } });
    Object.defineProperty(globalThis, "document", { configurable: true, value: {} });
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: { geolocation: {
      getCurrentPosition(success: (position: unknown) => void, failure: (error: unknown) => void, options: PositionOptions) {
        calls.push(Boolean(options.enableHighAccuracy));
        if (options.enableHighAccuracy) failure({ code: 2 });
        else success({ coords: { latitude: 49.123456, longitude: 24.123456 } });
      },
    } } });
    expect(await getPointLocation()).toEqual({ lat: 49.123456, lng: 24.123456 });
    expect(calls).toEqual([true, false]);
    calls.length = 0;
    navigator.geolocation.getCurrentPosition = (_success, failure, options) => { calls.push(Boolean(options?.enableHighAccuracy)); failure?.({ code: 1 } as GeolocationPositionError); };
    await expect(getPointLocation()).rejects.toThrow("заборонено");
    expect(calls).toEqual([true]);
  });
});