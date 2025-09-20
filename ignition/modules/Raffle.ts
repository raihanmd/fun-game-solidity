import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { HelperConfig } from "../helper/HelperConfig.js";

export default buildModule("RaffleModule", (m) => {
  const raffle = m.contract("Raffle", HelperConfig.getSepoliaConfig());

  m.call(raffle, "getInterval");

  return { raffle };
});
