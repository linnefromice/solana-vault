import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaVault } from "../target/types/solana_vault";
import * as SPL from "@solana/spl-token";
import { assert } from "chai";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { BN } from "bn.js";

describe("solana-vault", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaVault as Program<SolanaVault>;

  const ownerKeypair = anchor.web3.Keypair.generate();
  const mintUSDCKeypair = anchor.web3.Keypair.generate();
  const mintDAIKeypair = anchor.web3.Keypair.generate();
  const user1Keypair = anchor.web3.Keypair.generate();
  const user2Keypair = anchor.web3.Keypair.generate();

  it("test", async () => {
    // prepare
    console.log(`prepare`);
    //// airdrop
    console.log(`> execute: .requestAirdrop`);
    const airdropSigs = await Promise.all(
      [
        ownerKeypair,
        mintUSDCKeypair,
        mintDAIKeypair,
        user1Keypair,
        user2Keypair,
      ].map((keypair) =>
        provider.connection.requestAirdrop(
          keypair.publicKey,
          10 * LAMPORTS_PER_SOL
        )
      )
    );
    await Promise.all(
      airdropSigs.map((sig) => provider.connection.confirmTransaction(sig))
    );

    // Generate Mint Token
    const decimals = 6;
    console.log(`> execute: .createMint`);
    const USDC = await SPL.createMint(
      provider.connection,
      mintUSDCKeypair,
      mintUSDCKeypair.publicKey,
      null,
      decimals
    );
    const DAI = await SPL.createMint(
      provider.connection,
      mintDAIKeypair,
      mintDAIKeypair.publicKey,
      null,
      decimals
    );
    console.log(`> execute: .createAccount`);
    const user1USDC_TA = await SPL.createAccount(
      provider.connection,
      user1Keypair,
      USDC,
      user1Keypair.publicKey
    );
    const user2DAI_TA = await SPL.createAccount(
      provider.connection,
      user2Keypair,
      DAI,
      user2Keypair.publicKey
    );
    console.log(`> execute: SPLToken.mintTo`);
    await SPL.mintTo(
      provider.connection,
      mintUSDCKeypair,
      USDC,
      user1USDC_TA,
      mintUSDCKeypair,
      3 * Math.pow(10, decimals)
    );
    await SPL.mintTo(
      provider.connection,
      mintDAIKeypair,
      DAI,
      user2DAI_TA,
      mintDAIKeypair,
      5 * Math.pow(10, decimals)
    );
    assert.equal(
      (
        await SPL.getAccount(provider.connection, user1USDC_TA)
      ).amount.toString(),
      (3 * Math.pow(10, decimals)).toString()
    );
    assert.equal(
      (
        await SPL.getAccount(provider.connection, user2DAI_TA)
      ).amount.toString(),
      (5 * Math.pow(10, decimals)).toString()
    );

    // .initialize_token
    console.log(`.initialize_token`);
    await program.methods
      .initializeToken()
      .accounts({
        mintAccount: USDC,
        signer: ownerKeypair.publicKey,
      })
      .signers([ownerKeypair])
      .rpc();
    const [rootUSDCPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("root"), USDC.toBuffer()],
      program.programId
    );
    assert(
      (
        await program.account.rootState.fetch(rootUSDCPda)
      ).totalAmount.toNumber() == 0
    ); // Check if account exists

    await program.methods
      .initializeToken()
      .accounts({
        mintAccount: DAI,
        signer: ownerKeypair.publicKey,
      })
      .signers([ownerKeypair])
      .rpc();
    const [rootDAIPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("root"), DAI.toBuffer()],
      program.programId
    );
    assert(
      (
        await program.account.rootState.fetch(rootDAIPda)
      ).totalAmount.toNumber() == 0
    ); // Check if account exists

    // .deposit_token
    console.log(`.deposit_token`);
    const depositAmtUSDC = 2 * Math.pow(10, decimals);
    await program.methods
      .depositToken(new anchor.BN(depositAmtUSDC))
      .accounts({
        mintAccount: USDC,
        signer: user1Keypair.publicKey,
        signerAta: user1USDC_TA,
      })
      .signers([user1Keypair])
      .rpc();
    const depositAmtDAI = 3 * Math.pow(10, decimals);
    await program.methods
      .depositToken(new anchor.BN(depositAmtDAI))
      .accounts({
        mintAccount: DAI,
        signer: user2Keypair.publicKey,
        signerAta: user2DAI_TA,
      })
      .signers([user2Keypair])
      .rpc();

    const [user1DepositStatePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user"), user1Keypair.publicKey.toBuffer(), USDC.toBuffer()],
      program.programId
    );
    const [user2DepositStatePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user"), user2Keypair.publicKey.toBuffer(), DAI.toBuffer()],
      program.programId
    );

    const rootStateUSDC = await program.account.rootState.fetch(rootUSDCPda);
    assert(rootStateUSDC.totalAmount.toNumber() == depositAmtUSDC);
    const rootStateDAI = await program.account.rootState.fetch(rootDAIPda);
    assert(rootStateDAI.totalAmount.toNumber() == depositAmtDAI);
    const user1State = await program.account.depositState.fetch(
      user1DepositStatePda
    );
    assert(user1State.totalAmount.toNumber() == depositAmtUSDC);
    const user2State = await program.account.depositState.fetch(
      user2DepositStatePda
    );
    assert(user2State.totalAmount.toNumber() == depositAmtDAI);

    assert.equal(
      (
        await SPL.getAccount(provider.connection, user1USDC_TA)
      ).amount.toString(),
      (3 * Math.pow(10, decimals) - depositAmtUSDC).toString()
    );
    assert.equal(
      (
        await SPL.getAccount(provider.connection, user2DAI_TA)
      ).amount.toString(),
      (5 * Math.pow(10, decimals) - depositAmtDAI).toString()
    );
    assert.equal(
      (
        await SPL.getAccount(provider.connection, rootStateUSDC.authority)
      ).amount.toString(),
      depositAmtUSDC.toString()
    );
    assert.equal(
      (
        await SPL.getAccount(provider.connection, rootStateDAI.authority)
      ).amount.toString(),
      depositAmtDAI.toString()
    );

    // .initialize_sol
    console.log(`.initialize_sol`);
    await program.methods
      .initializeSol()
      .accounts({
        signer: ownerKeypair.publicKey,
      })
      .signers([ownerKeypair])
      .rpc();

    const [rootSolPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("root-sol")],
      program.programId
    );
    assert(
      (
        await program.account.rootState.fetch(rootSolPda)
      ).totalAmount.toNumber() == 0
    );

    // .transfer_sol
    console.log(`.transfer_sol`);
    const amtSol = 3 * LAMPORTS_PER_SOL;
    const _rootAccountInfo = await provider.connection.getAccountInfo(
      rootSolPda
    );
    const beforeSolInRoot = _rootAccountInfo.lamports;
    const _user1AccountInfo = await provider.connection.getAccountInfo(
      user1Keypair.publicKey
    );
    const beforeSolInUser1 = _user1AccountInfo.lamports;
    await program.methods
      .depositSol(new BN(amtSol))
      .accounts({
        signer: user1Keypair.publicKey,
      })
      .signers([user1Keypair])
      .rpc();
    const [user1SolPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("user"),
        user1Keypair.publicKey.toBuffer(),
        Buffer.from("sol"),
      ],
      program.programId
    );
    const user1SolState = await program.account.depositState.fetch(user1SolPda);
    assert(user1SolState.totalAmount.toNumber() == amtSol);
    const rootAccountInfo = await provider.connection.getAccountInfo(
      rootSolPda
    );
    const afterSolInRoot = rootAccountInfo.lamports;
    const user1AccountInfo = await provider.connection.getAccountInfo(
      user1Keypair.publicKey
    );
    const afterSolInUser1 = user1AccountInfo.lamports;
    assert(afterSolInRoot - beforeSolInRoot == amtSol);
    // consider the fee
    assert(beforeSolInUser1 - afterSolInUser1 > amtSol);
    assert(beforeSolInUser1 - afterSolInUser1 < amtSol * 1.001);
  });
});
