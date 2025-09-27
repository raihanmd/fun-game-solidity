import test, { describe } from "node:test";
import assert from "node:assert";

import { network } from "hardhat";
import RaffleModuleLocalhost from "../../ignition/modules/RaffleModuleLocalhost.js";

const MIN_ENTRANCE_FEE = 1e14;
const INTERVAL = 86400;

const RAFFLE_CONTRACT = RaffleModuleLocalhost;

describe("Raffle enterRaffle", async function () {
  const { viem, ignition } = await network.connect();

  const [player1, player2, player3] = await viem.getWalletClients();
  const testClient = await viem.getTestClient();

  const players = [player1, player2, player3];

  const { raffle, vrfCoordinator } = await ignition.deploy(RAFFLE_CONTRACT, {
    parameters: {
      ChainlinkMockModule: {
        mockBaseFee: "100000000000000000",
        mockGasPrice: "1000000000",
        mockWeiPerUintLink: "4000000000000000",
      },
      RaffleModule: {
        entranceFee: "100000000000000",
        interval: "86400",
        keyHash:
          "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
        subscriptionId: "0",
        callbackGasLimit: "500000",
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

    // await player1.writeContract({
    //   address: raffle.address,
    //   abi: raffle.abi,
    //   functionName: "performUpkeep",
    //   args: ["0x"],
    // });

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

  const { raffle } = await ignition.deploy(RAFFLE_CONTRACT);

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
