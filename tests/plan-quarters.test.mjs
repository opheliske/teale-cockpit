import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPlanQuarters } from "../src/lib/plan-quarters.ts";

test("returns 4 quarters of 3 months each", () => {
  const quarters = buildPlanQuarters("2026-01-01");
  assert.equal(quarters.length, 4);
  assert.deepEqual(
    quarters.map((q) => q.id),
    ["Q1", "Q2", "Q3", "Q4"],
  );
  for (const q of quarters) {
    assert.equal(q.months.length, 3);
  }
});

test("Q1 is always Jan/Feb/Mar, ignoring the contract start", () => {
  // The layout is calendar-aligned: the contract start no longer anchors Q1.
  const quarters = buildPlanQuarters("2026-04-01");
  assert.equal(quarters[0].months[0].en, "January");
  assert.equal(quarters[0].months[0].num, 0);
  // Q2 = Apr/May/Jun.
  assert.equal(quarters[1].months[0].en, "April");
  assert.equal(quarters[1].months[0].num, 3);
});

test("Q4 is Oct/Nov/Dec of the display year, no year wrap", () => {
  const quarters = buildPlanQuarters(undefined, 2026);
  const q4 = quarters[3].months;
  assert.equal(q4[0].en, "October");
  assert.equal(q4[2].en, "December");
  assert.equal(q4[2].year, 2026);
});

test("the optional year argument shifts every month's year", () => {
  const quarters = buildPlanQuarters(undefined, 2027);
  assert.ok(quarters.every((q) => q.months.every((m) => m.year === 2027)));
});

test("defaults to January when no contract start is given", () => {
  const quarters = buildPlanQuarters(undefined);
  assert.equal(quarters[0].months[0].num, 0);
});

test("a fully past quarter is marked 'past'", () => {
  // A display year well before today → Q1 is entirely in the past.
  const quarters = buildPlanQuarters(undefined, 2000);
  assert.equal(quarters[0].status, "past");
  assert.ok(quarters[0].months.every((m) => m.status === "past"));
});
