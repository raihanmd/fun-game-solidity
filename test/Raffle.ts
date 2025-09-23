import { describe } from "node:test";

import { network } from "hardhat";

describe("Raffle", async function () {
  const { viem } = await network.connect();

  const raffle = await viem.deployContract("Raffle");
});
