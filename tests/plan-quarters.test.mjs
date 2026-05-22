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

test("Q1 starts on the contract's start month", () => {
  const quarters = buildPlanQuarters("2026-04-01");
  assert.equal(quarters[0].months[0].en, "April");
  assert.equal(quarters[0].months[0].num, 3);
  // Q2 follows on from Q1.
  assert.equal(quarters[1].months[0].en, "July");
});

test("wraps the calendar year across December", () => {
  const quarters = buildPlanQuarters("2026-11-01");
  const first = quarters[0].months;
  assert.equal(first[0].en, "November");
  assert.equal(first[0].year, 2026);
  assert.equal(first[2].en, "January");
  assert.equal(first[2].year, 2027);
});

test("defaults to January when no contract start is given", () => {
  const quarters = buildPlanQuarters(undefined);
  assert.equal(quarters[0].months[0].num, 0);
});

test("a fully past quarter is marked 'past'", () => {
  // A contract that started well before today → Q1 is entirely in the past.
  const quarters = buildPlanQuarters("2000-01-01");
  assert.equal(quarters[0].status, "past");
  assert.ok(quarters[0].months.every((m) => m.status === "past"));
});
