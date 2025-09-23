import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ChainlinkMockModule } from "./depedency/ChainlinkMockModule.js";

export default buildModule("RaffleModule", (m) => {
  const entranceFee = m.getParameter("entranceFee");
  const interval = m.getParameter("interval");
  const keyHash = m.getParameter("keyHash");
  const subscriptionId = m.getParameter("subscriptionId");
  const callbackGasLimit = m.getParameter("callbackGasLimit");

  const { vrfCoordinator } = m.useModule(ChainlinkMockModule);

  const raffle = m.contract("Raffle", [
    entranceFee,
    interval,
    vrfCoordinator,
    keyHash,
    subscriptionId,
    callbackGasLimit,
  ]);

  return { raffle, vrfCoordinator };
});
