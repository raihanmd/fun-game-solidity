type NetworkConfig = [
  /* entranceFee */ string,
  /* interval */ number,
  /* vrfCoordinator */ string,
  /* keyHash */ string,
  /* subscriptionId */ string,
  /* callbackGasLimit */ number
];

export class HelperConfig {
  static oneDayInSeconds = 24 * 60 * 60;

  static getSepoliaConfig(): NetworkConfig {
    return [
      "100000000000000", // entranceFee
      this.oneDayInSeconds, // interval
      "0x9ddfaca8183c41ad55329bdeed9f6a8d53168b1b", // vrfCoordinator
      "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae", // keyHash
      "74229658597778471823553668351449848182860044837466327382704763303783947320514", // subscriptionId
      500_000, // callbackGasLimit
    ];
  }
}
