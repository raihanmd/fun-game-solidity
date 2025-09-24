import test, { describe } from "node:test";
import assert from "node:assert";

import { network } from "hardhat";
import RaffleModuleLocalhost from "../../ignition/modules/RaffleModuleLocalhost.js";

const MIN_ENTRANCE_FEE = 1e14;

describe("Raffle Localhost", async function () {
  const { viem, ignition } = await network.connect();

  const [player1, player2, player3] = await viem.getWalletClients();

  const { raffle } = await ignition.deploy(RaffleModuleLocalhost);

  test("player should be able to enter the raffle", async function () {
    await player1.writeContract({
      address: raffle.address,
      abi: raffle.abi,
      functionName: "enterRaffle",
      args: [],
      value: BigInt(MIN_ENTRANCE_FEE),
    });

    await player2.writeContract({
      address: raffle.address,
      abi: raffle.abi,
      functionName: "enterRaffle",
      args: [],
      value: BigInt(MIN_ENTRANCE_FEE),
    });

    await player3.writeContract({
      address: raffle.address,
      abi: raffle.abi,
      functionName: "enterRaffle",
      args: [],
      value: BigInt(MIN_ENTRANCE_FEE),
    });

    assert.notStrictEqual(
      (await raffle.read.getPlayers()).map((v) => v.toUpperCase()),
      [
        player1.account.address.toUpperCase(),
        player2.account.address.toUpperCase(),
        player3.account.address.toUpperCase(),
      ]
    );
  });

  test("player should be not able to enter the raffle, if the entrance fee is not enough", async function () {
    assert.rejects(async () => {
      await player1.writeContract({
        address: raffle.address,
        abi: raffle.abi,
        functionName: "enterRaffle",
        args: [],
        value: BigInt(MIN_ENTRANCE_FEE - 1),
      });
    });
  });
});
