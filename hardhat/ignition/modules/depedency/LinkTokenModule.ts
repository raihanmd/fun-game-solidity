import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export const LinkTokenModule = buildModule("LinkTokenModule", (m) => {
  const linkToken = m.contract("LinkToken");

  return { linkToken };
});
