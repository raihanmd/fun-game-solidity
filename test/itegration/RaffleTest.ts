import test, { describe } from "node:test";
import assert from "node:assert";

import { network } from "hardhat";
import RaffleModuleSepolia from "../../ignition/modules/RaffleModuleSepolia.js";

const MIN_ENTRANCE_FEE = 1e14;
const INTERVAL = 86400;

describe("Raffle enterRaffle", async function () {
  const { viem, ignition } = await network.connect();

  const [player1, player2, player3] = await viem.getWalletClients();
  const testClient = await viem.getTestClient();

  const players = [player1, player2, player3];

  const { raffle } = await ignition.deploy(RaffleModuleSepolia, {
    parameters: {
      RaffleModule: {
        entranceFee: "100000000000000",
        interval: INTERVAL,
        keyHash:
          "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
        subscriptionId: "12345",
        callbackGasLimit: "500000",
        vrfCoordinatorAddress: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
      },
    },
  });

  test("player should be able to enter the raffle", async function () {
    players.forEach(async (p) => {
      await p.writeContract({
        address: raffle.address,
        abi: raffle.abi,
        functionName: "enterRaffle",
        args: [],
        value: BigInt(MIN_ENTRANCE_FEE),
      });
    });

    assert.notStrictEqual(
      (await raffle.read.getPlayers()).map((v) => v.toLowerCase()),
      players
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

  test("player should be not able to enter the raffle, if the state is not open", async function () {
    await testClient.mine({
      blocks: 5,
      interval: INTERVAL + 1,
    });

    await player1.writeContract({
      address: raffle.address,
      abi: raffle.abi,
      functionName: "performUpkeep",
      args: ["0x"],
    });

    const state = await raffle.read.getRaffleState();

    console.log("🚀 ~ state:", state);

    assert.rejects(async () => {
      await player1.writeContract({
        address: raffle.address,
        abi: raffle.abi,
        functionName: "enterRaffle",
        args: [],
        value: BigInt(MIN_ENTRANCE_FEE),
      });
    });
  });
});

describe("Raffle performUpkeep", async function () {
  const { viem, ignition } = await network.connect();

  const [player1, player2, player3] = await viem.getWalletClients();

  const players = [player1, player2, player3];

  const testClient = await viem.getTestClient();

  const { raffle } = await ignition.deploy(RaffleModuleSepolia);

  players.forEach(async (p) => {
    await p.writeContract({
      address: raffle.address,
      abi: raffle.abi,
      functionName: "enterRaffle",
      args: [],
      value: BigInt(MIN_ENTRANCE_FEE),
    });
  });

  test("checkUpkeep should be false if the interval was not passed", async () => {
    const upkeep = await raffle.read.checkUpkeep(["0x"]);

    assert.equal(upkeep[0], false);
  });

  test("checkUpkeep should be true if the interval was passed", async () => {
    await testClient.mine({
      blocks: 2,
      interval: INTERVAL + 1,
    });

    const upkeep = await raffle.read.checkUpkeep(["0x"]);

    assert.equal(upkeep[0], true);
  });
});
