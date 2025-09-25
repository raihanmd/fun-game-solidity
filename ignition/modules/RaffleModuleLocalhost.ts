import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ChainlinkMockModule } from "./depedency/ChainlinkMockModule.js";

export default buildModule("RaffleModule", (m) => {
  const entranceFee = m.getParameter("entranceFee", "100000000000000");
  const interval = m.getParameter("interval", "10");
  const keyHash = m.getParameter(
    "keyHash",
    "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae"
  );
  const subscriptionId = m.getParameter("subscriptionId", "0");
  const callbackGasLimit = m.getParameter("callbackGasLimit", "500000");

  const { vrfCoordinator } = m.useModule(ChainlinkMockModule);

  const raffle = m.contract("Raffle", [
    entranceFee,
    interval,
    vrfCoordinator,
    keyHash,
    subscriptionId,
    callbackGasLimit,
  ]);

  return { raffle };
});
