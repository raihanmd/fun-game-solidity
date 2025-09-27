import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ChainlinkMockModule } from "./depedency/ChainlinkMockModule.js";

export default buildModule("RaffleModule", (m) => {
  const entranceFee = m.getParameter("entranceFee", "100000000000000");
  const interval = m.getParameter("interval", "86400");
  const keyHash = m.getParameter(
    "keyHash",
    "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae"
  );
  const callbackGasLimit = m.getParameter("callbackGasLimit", "500000");

  const { vrfCoordinator } = m.useModule(ChainlinkMockModule);

  const subscriptionId = m.call(vrfCoordinator, "createSubscription", []);

  m.call(vrfCoordinator, "fundSubscription", [
    subscriptionId.value,
    "1000000000000000000",
  ]);

  const raffle = m.contract("Raffle", [
    entranceFee,
    interval,
    vrfCoordinator,
    keyHash,
    subscriptionId.value,
    callbackGasLimit,
  ]);

  return { raffle, vrfCoordinator };
});
