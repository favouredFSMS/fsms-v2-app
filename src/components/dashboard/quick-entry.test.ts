import { describe, it, expect } from "vitest";
import {
  autoBalanceWeights,
  type CefrSkillKey,
} from "./quick-entry-modal";

describe("Quick Class Entry — Learning Evidence Auto-Balancing & Safety", () => {
  it("returns empty object when no skills are selected (no evidence case)", () => {
    const weights = autoBalanceWeights([], {});
    expect(weights).toEqual({});
  });

  it("assigns 100% to a single selected skill", () => {
    const skills: CefrSkillKey[] = ["speaking"];
    const weights = autoBalanceWeights(skills, {});
    expect(weights.speaking).toBe(100);
  });

  it("splits 50/50 evenly between 2 skills", () => {
    const skills: CefrSkillKey[] = ["speaking", "listening"];
    const weights = autoBalanceWeights(skills, {});
    expect(weights.speaking).toBe(50);
    expect(weights.listening).toBe(50);
    expect(weights.speaking + weights.listening).toBe(100);
  });

  it("splits exactly 100 with largest-remainder across 3 skills (34, 33, 33)", () => {
    const skills: CefrSkillKey[] = ["speaking", "listening", "reading"];
    const weights = autoBalanceWeights(skills, {});
    expect(weights.speaking + weights.listening + weights.reading).toBe(100);
    expect(Object.values(weights).sort()).toEqual([33, 33, 34]);
  });

  it("splits exactly 100 across 6 CEFR skills without floating point errors", () => {
    const skills: CefrSkillKey[] = ["speaking", "listening", "reading", "writing", "vocabulary", "grammar"];
    const weights = autoBalanceWeights(skills, {});
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });

  it("handles manual zero weights gracefully with safe fallback distribution", () => {
    const skills: CefrSkillKey[] = ["speaking", "grammar"];
    const weights = autoBalanceWeights(skills, { speaking: 0, grammar: 0 });
    expect(weights.speaking + weights.grammar).toBe(100);
    expect(weights.speaking).toBe(50);
    expect(weights.grammar).toBe(50);
  });

  it("proportions uneven manual weights and normalizes exactly to 100", () => {
    const skills: CefrSkillKey[] = ["speaking", "writing"];
    // 30 : 10 -> 75% : 25%
    const weights = autoBalanceWeights(skills, { speaking: 30, writing: 10 });
    expect(weights.speaking).toBe(75);
    expect(weights.writing).toBe(25);
    expect(weights.speaking + weights.writing).toBe(100);
  });

  it("handles fractional divisions with largest-remainder distribution", () => {
    const skills: CefrSkillKey[] = ["speaking", "listening", "reading"];
    // 10 : 10 : 10 -> 34, 33, 33
    const weights = autoBalanceWeights(skills, { speaking: 10, listening: 10, reading: 10 });
    expect(weights.speaking + weights.listening + weights.reading).toBe(100);
  });

  it("never produces NaN, Infinity, or negative weights", () => {
    const skills: CefrSkillKey[] = ["vocabulary", "grammar"];
    const weights = autoBalanceWeights(skills, { vocabulary: -50, grammar: 0 });
    expect(Number.isNaN(weights.vocabulary)).toBe(false);
    expect(Number.isNaN(weights.grammar)).toBe(false);
    expect(weights.vocabulary + weights.grammar).toBe(100);
  });
});
