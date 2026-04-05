import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CarbonIq } from "../target/types/carbon_iq";
import { expect } from "chai";

describe("carbon_iq", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.CarbonIq as Program<CarbonIq>;
  const user = provider.wallet;

  it("Records a proof of impact", async () => {
    const [proofPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("proof"), user.publicKey.toBuffer()],
      program.programId
    );

    const co2Amount = new anchor.BN(1500); // 1500 grams

    await program.methods
      .recordImpact(co2Amount)
      .accounts({
        proofOfImpact: proofPda,
        user: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const account = await program.account.proofOfImpact.fetch(proofPda);
    expect(account.userWallet.toBase58()).to.equal(user.publicKey.toBase58());
    expect(account.co2OffsetAmount.toNumber()).to.equal(1500);
    expect(account.timestamp.toNumber()).to.be.greaterThan(0);
  });

  it("Updates an existing proof of impact", async () => {
    const [proofPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("proof"), user.publicKey.toBuffer()],
      program.programId
    );

    const additionalOffset = new anchor.BN(500);

    await program.methods
      .updateImpact(additionalOffset)
      .accounts({
        proofOfImpact: proofPda,
        user: user.publicKey,
      })
      .rpc();

    const account = await program.account.proofOfImpact.fetch(proofPda);
    expect(account.co2OffsetAmount.toNumber()).to.equal(2000);
  });
});
