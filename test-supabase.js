require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log("Testing Supabase connection...");

  // 1. Insert a fake debt
  const { data: insertedDebt, error: insertError } = await supabase
    .from("debts")
    .insert({
      guild_id: "test_guild",
      channel_id: "test_channel",
      debtor_id: "test_debtor",
      creditor_id: "test_creditor",
      amount_cents: 1250,
      reason: "test ramen",
      paid: false
    })
    .select()
    .single();

  if (insertError) {
    console.error("Insert failed:", insertError);
    return;
  }

  console.log("Inserted debt:", insertedDebt);

  // 2. Read unpaid debts
  const { data: unpaidDebts, error: selectError } = await supabase
    .from("debts")
    .select("*")
    .eq("paid", false);

  if (selectError) {
    console.error("Select failed:", selectError);
    return;
  }

  console.log("Unpaid debts:", unpaidDebts);

  // 3. Mark the inserted debt as paid
  const { data: updatedDebt, error: updateError } = await supabase
    .from("debts")
    .update({
      paid: true,
      paid_at: new Date().toISOString()
    })
    .eq("id", insertedDebt.id)
    .select()
    .single();

  if (updateError) {
    console.error("Update failed:", updateError);
    return;
  }

  console.log("Updated debt:", updatedDebt);

  console.log("Supabase test complete.");
}

main();