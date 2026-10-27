module veto::pick;

use std::string::{Self, String};
use sui::event;

const ENotBettor: u64 = 0;
const EAlreadyGraded: u64 = 1;
const EBadOutcome: u64 = 2;

public struct Pick has key, store {
    id: UID,
    bettor: address,
    market_id: String,
    cell: String,
    side: u8,
    book_bps: u64,
    chain_bps: u64,
    close_bps: u64,
    outcome: u8,
    declared_size: u64,
    placed_ms: u64,
    graded_ms: u64,
}

public struct PickPlaced has copy, drop {
    pick_id: ID,
    market_id: String,
    bettor: address,
    placed_ms: u64,
}

public struct PickGraded has copy, drop {
    pick_id: ID,
    close_bps: u64,
    outcome: u8,
}

fun copy_string(source: &String): String {
    let bytes_ref = source.as_bytes();
    let mut copied = vector[];
    let mut i = 0;
    let n = vector::length(bytes_ref);
    while (i < n) {
        vector::push_back(&mut copied, *vector::borrow(bytes_ref, i));
        i = i + 1;
    };
    string::utf8(copied)
}

public fun place(
    market_id: String,
    cell: String,
    side: u8,
    book_bps: u64,
    chain_bps: u64,
    declared_size: u64,
    ctx: &mut TxContext,
): Pick {
    let bettor = tx_context::sender(ctx);
    let placed_ms = tx_context::epoch_timestamp_ms(ctx);
    let market_for_event = copy_string(&market_id);
    let pick = Pick {
        id: object::new(ctx),
        bettor,
        market_id,
        cell,
        side,
        book_bps,
        chain_bps,
        close_bps: 0,
        outcome: 0,
        declared_size,
        placed_ms,
        graded_ms: 0,
    };
    event::emit(PickPlaced {
        pick_id: object::id(&pick),
        market_id: market_for_event,
        bettor,
        placed_ms,
    });
    pick
}

public fun grade(pick: &mut Pick, close_bps: u64, outcome: u8, ctx: &TxContext) {
    assert!(pick.bettor == tx_context::sender(ctx), ENotBettor);
    assert!(pick.outcome == 0, EAlreadyGraded);
    assert!(outcome == 1 || outcome == 2, EBadOutcome);
    pick.close_bps = close_bps;
    pick.outcome = outcome;
    pick.graded_ms = tx_context::epoch_timestamp_ms(ctx);
    event::emit(PickGraded {
        pick_id: object::id(pick),
        close_bps,
        outcome,
    });
}

#[test]
fun place_then_grade() {
    use sui::test_scenario;

    let alice = @0xA;
    let mut scenario = test_scenario::begin(alice);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let pick = place(
            b"0xmarket".to_string(),
            b"nfl:moneyline".to_string(),
            1,
            4500,
            5100,
            25,
            ctx,
        );
        transfer::public_transfer(pick, alice);
    };
    test_scenario::next_tx(&mut scenario, alice);
    {
        let mut pick = test_scenario::take_from_sender<Pick>(&scenario);
        assert!(pick.outcome == 0, 0);
        assert!(pick.chain_bps == 5100, 1);
        let ctx = test_scenario::ctx(&mut scenario);
        grade(&mut pick, 4200, 2, ctx);
        assert!(pick.outcome == 2, 2);
        assert!(pick.close_bps == 4200, 3);
        test_scenario::return_to_sender(&scenario, pick);
    };
    test_scenario::end(scenario);
}
