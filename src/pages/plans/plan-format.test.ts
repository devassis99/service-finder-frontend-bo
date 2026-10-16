import { describe, expect, it } from "vitest";
import { formatMoney, parseMoneyToCents, parseWholeNumber, slugifyKey } from "./plan-format";

describe("slugifyKey", () => {
  it("makes the backend's key shape out of a display name", () => {
    expect(slugifyKey("Pro")).toBe("pro");
    expect(slugifyKey("  Pro Plus — Annual!  ")).toBe("pro_plus_annual");
    expect(slugifyKey("Café Équipe")).toBe("cafe_equipe");
    expect(slugifyKey("!!!")).toBe("");
  });

  it("always matches the backend's validator", () => {
    for (const name of ["Team 10", "a--b__c", "Über", "x"]) {
      expect(slugifyKey(name)).toMatch(/^[a-z0-9]+(?:_[a-z0-9]+)*$/);
    }
  });
});

describe("parseMoneyToCents", () => {
  it("reads dollars and cents", () => {
    expect(parseMoneyToCents("49")).toBe(4900);
    expect(parseMoneyToCents("49.5")).toBe(4950);
    expect(parseMoneyToCents(" 0.29 ")).toBe(29);
  });

  it("refuses what isn't a positive amount", () => {
    for (const raw of ["", "0", "-5", "4.999", "1,000", "abc"]) {
      expect(parseMoneyToCents(raw)).toBeNull();
    }
  });
});

describe("parseWholeNumber", () => {
  it("tells blank, valid and invalid apart", () => {
    expect(parseWholeNumber("", { min: 0 })).toBeUndefined();
    expect(parseWholeNumber("14", { min: 0 })).toBe(14);
    expect(parseWholeNumber("0", { min: 1 })).toBeNull();
    expect(parseWholeNumber("2.5", { min: 0 })).toBeNull();
  });
});

describe("formatMoney", () => {
  it("formats Stripe's integer amounts, minding zero-decimal currencies", () => {
    expect(formatMoney(4900, "usd")).toBe("$49.00");
    expect(formatMoney(7900, "eur")).toBe("€79.00");
    expect(formatMoney(1000, "jpy")).toBe("¥1,000");
  });
});
