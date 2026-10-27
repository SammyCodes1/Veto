import assert from "node:assert/strict";
import test from "node:test";
import { gradesAgree } from "./clv";
import { canLog, decide } from "./decision";
import type { GradedTicket } from "./types";

function tickets(cell: GradedTicket["cell"], clvs: number[], won = false): GradedTicket[] {
  return clvs.map((clvPp, index) => ({
    id: `${cell}-${index}`,
    cell,
    clvPp,
    won,
  }));
}

test("four losing tickets stay in learning", () => {
  const decision = decide(tickets("nfl:moneyline", [-10, -10, -10, -10]), "nfl:moneyline");
  assert.equal(decision.stamp, "LEARNING");
  assert.equal(decision.samples, 4);
  assert.equal(canLog(decision.stamp, true), true);
});

test("five tickets at -3.0 are a veto", () => {
  const decision = decide(tickets("nfl:moneyline", [-3, -3, -3, -3, -3]), "nfl:moneyline");
  assert.equal(decision.stamp, "VETO");
  assert.equal(decision.meanClv, -3);
  assert.equal(canLog(decision.stamp, true), false);
  assert.match(decision.clause, /Block nfl:moneyline/);
});

test("five tickets at -2.9 stay flat", () => {
  const decision = decide(tickets("nfl:moneyline", [-2.9, -2.9, -2.9, -2.9, -2.9]), "nfl:moneyline");
  assert.equal(decision.stamp, "FLAT");
  assert.equal(canLog(decision.stamp, true), true);
});

test("five tickets at +2.0 are allowed", () => {
  const decision = decide(tickets("nba:total", [2, 2, 2, 2, 2]), "nba:total");
  assert.equal(decision.stamp, "ALLOW");
  assert.equal(decision.meanClv, 2);
});

test("a win with a bad price still pulls the cell down", () => {
  const row = tickets("nfl:moneyline", [-10, -10, -10, -10, -10], true);
  const decision = decide(row, "nfl:moneyline");
  assert.equal(row.every((ticket) => ticket.won), true);
  assert.equal(decision.stamp, "VETO");
  assert.ok(decision.meanClv < 0);
});

test("cold start hides the record and does not delete it", () => {
  const decision = decide(tickets("nfl:moneyline", [-10, -10, -10, -10, -10]), "nfl:moneyline", true);
  assert.equal(decision.stamp, "LEARNING");
  assert.deepEqual(decision.citedIds, []);
  assert.match(decision.clause, /not deleted/);
});

test("other cells do not leak into the stamp", () => {
  const mixed = [
    ...tickets("nba:total", [8, 8, 8, 8, 8]),
    ...tickets("nfl:moneyline", [-1]),
  ];
  const decision = decide(mixed, "nfl:moneyline");
  assert.equal(decision.stamp, "LEARNING");
  assert.equal(decision.samples, 1);
});

test("a grade within one point of Tatum is accepted", () => {
  assert.equal(gradesAgree(4200, 0.425), true);
  assert.equal(gradesAgree(4200, 0.45), false);
});
