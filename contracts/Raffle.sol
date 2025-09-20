//* Layout of Contract:
//* version
//* imports
//* errors
//* interfaces, libraries, contracts
//* Type declarations
//* State variables
//* Events
//* Modifiers
//* Functions

//* Layout of Functions:
//* constructor
//* receive function (if exists)
//* fallback function (if exists)
//* external
//* public
//* internal
//* private
//* view & pure functions

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

/**
 * @title Decentralized Raffle Contract
 * @author raihanmd
 * @notice This contract implements a provably fair, decentralized raffle system using Chainlink VRF for randomness and Chainlink Automation for automated execution
 * @dev Inherits from VRFConsumerBaseV2Plus for secure randomness and AutomationCompatibleInterface for automated upkeep
 * @custom:security-contact security@example.com
 */
contract Raffle is VRFConsumerBaseV2Plus, AutomationCompatibleInterface {
    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    /// @notice Thrown when the entrance fee sent is insufficient
    error Raffle__NotEnoughEthSent();

    /// @notice Thrown when the prize transfer to winner fails
    error Raffle__TransferFailed();

    /// @notice Thrown when trying to enter a raffle that is not open
    error Raffle__RaffleNotOpen();

    /// @notice Thrown when upkeep is not needed based on current conditions
    /// @param balance Current contract balance
    /// @param numPlayers Number of players in the raffle
    /// @param raffleState Current state of the raffle
    error Raffle__UpkeepNotNeeded(
        uint256 balance,
        uint256 numPlayers,
        RaffleState raffleState
    );

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when a player enters the raffle
    /// @param player The address of the player who entered
    event Raffle__PlayerEnter(address indexed player);

    /// @notice Emitted when a winner is selected
    /// @param player The address of the winning player
    event Raffle__PlayerWinner(address indexed player);

    /*//////////////////////////////////////////////////////////////
                            TYPE DECLARATIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Enumeration representing the current state of the raffle
    enum RaffleState {
        OPEN, /// @dev Raffle is open for entries (0)
        CALCULATING /// @dev Raffle is calculating winner using VRF (1)
    }

    /*//////////////////////////////////////////////////////////////
                               CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @dev Number of block confirmations to wait for VRF response
    uint16 private constant REQUEST_CONFIRMATIONS = 3;

    /// @dev Number of random words to request from VRF
    uint16 private constant NUM_WORDS = 1;

    /// @dev Whether to use native payment for VRF requests
    bool private constant ENABLE_NATIVE_PAYMENT = false;

    /*//////////////////////////////////////////////////////////////
                            IMMUTABLE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Minimum fee required to enter the raffle
    uint256 private immutable i_entranceFee;

    /// @notice Time interval between raffle rounds in seconds
    uint256 private immutable i_interval;

    /// @notice Chainlink VRF key hash for gas price tier
    bytes32 private immutable i_keyhash;

    /// @notice Chainlink VRF subscription ID
    uint256 private immutable i_subscriptionId;

    /// @notice Gas limit for VRF callback function
    uint32 private immutable i_callbackGasLimit;

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @dev Array of all players who entered the current raffle round
    address payable[] private s_players;

    /// @dev Timestamp when the last raffle round was completed
    uint256 private s_lastTimestamp;

    /// @dev Address of the most recent winner
    address private s_recentWinner;

    /// @dev Current state of the raffle
    RaffleState private s_raffleState;

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Initializes the Raffle contract with required parameters
     * @param entranceFee Minimum fee in wei required to enter the raffle
     * @param interval Time in seconds between raffle rounds
     * @param vrfCoordinator Address of the Chainlink VRF Coordinator contract
     * @param keyHash The gas lane key hash value for VRF requests
     * @param subscriptionId The subscription ID for funding VRF requests
     * @param callbackGasLimit Gas limit for the VRF callback function
     * @dev Sets the initial raffle state to OPEN and records deployment timestamp
     */
    constructor(
        uint256 entranceFee,
        uint256 interval,
        address vrfCoordinator,
        bytes32 keyHash,
        uint256 subscriptionId,
        uint32 callbackGasLimit
    ) VRFConsumerBaseV2Plus(vrfCoordinator) {
        i_entranceFee = entranceFee;
        i_interval = interval;
        s_lastTimestamp = block.timestamp;
        i_keyhash = keyHash;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_raffleState = RaffleState.OPEN;
    }

    /*//////////////////////////////////////////////////////////////
                           EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Allows a player to enter the raffle by paying the entrance fee
     * @dev Reverts if insufficient fee is sent or raffle is not open
     * @custom:throws Raffle__NotEnoughEthSent if msg.value < entrance fee
     * @custom:throws Raffle__RaffleNotOpen if raffle state is CALCULATING
     */
    function enterRaffle() external payable {
        if (msg.value < i_entranceFee) {
            revert Raffle__NotEnoughEthSent();
        }

        if (s_raffleState == RaffleState.CALCULATING) {
            revert Raffle__RaffleNotOpen();
        }

        s_players.push(payable(msg.sender));

        emit Raffle__PlayerEnter(msg.sender);
    }

    /**
     * @notice Performs the upkeep by triggering winner selection
     * @param * performData * Additional data (unused in this implementation)
     * @dev Called by Chainlink Automation when upkeep is needed
     * @custom:throws Raffle__UpkeepNotNeeded if conditions for upkeep are not met
     */
    function performUpkeep(bytes calldata /* performData */) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");

        if (!upkeepNeeded) {
            revert Raffle__UpkeepNotNeeded(
                address(this).balance,
                s_players.length,
                s_raffleState
            );
        }

        pickWinner();
    }

    /*//////////////////////////////////////////////////////////////
                           INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Initiates the winner selection process using Chainlink VRF
     * @dev Sets raffle state to CALCULATING and requests random words from VRF
     */
    function pickWinner() internal {
        s_raffleState = RaffleState.CALCULATING;

        VRFV2PlusClient.RandomWordsRequest memory request = VRFV2PlusClient
            .RandomWordsRequest({
                keyHash: i_keyhash,
                subId: i_subscriptionId,
                requestConfirmations: REQUEST_CONFIRMATIONS,
                callbackGasLimit: i_callbackGasLimit,
                numWords: NUM_WORDS,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({
                        nativePayment: ENABLE_NATIVE_PAYMENT
                    })
                )
            });

        s_vrfCoordinator.requestRandomWords(request);
    }

    /**
     * @notice Callback function called by VRF Coordinator with random words
     * @param * requestId * The ID of the VRF request (unused)
     * @param randomWords Array of random words from VRF
     * @dev Selects winner, transfers prize, and resets raffle for next round
     * @custom:throws Raffle__TransferFailed if prize transfer to winner fails
     */
    function fulfillRandomWords(
        uint256 /* requestId */,
        uint256[] calldata randomWords
    ) internal override {
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable winner = s_players[indexOfWinner];

        s_recentWinner = winner;

        // Reset the raffle
        s_players = new address payable[](0);
        s_lastTimestamp = block.timestamp;
        s_raffleState = RaffleState.OPEN;

        emit Raffle__PlayerWinner(winner);

        (bool success, ) = winner.call{value: address(this).balance}("");

        if (!success) {
            revert Raffle__TransferFailed();
        }
    }

    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Checks if upkeep is needed for the raffle
     * @param * checkData * Additional data for the check (unused)
     * @return upkeepNeeded True if upkeep is needed, false otherwise
     * @return performData Data to pass to performUpkeep (empty in this case)
     * @dev Upkeep is needed when: time has passed, raffle is open, has balance, and has players
     */
    function checkUpkeep(
        bytes memory /* checkData */
    )
        public
        view
        override
        returns (bool upkeepNeeded, bytes memory /* performData */)
    {
        bool timePassed = (block.timestamp - s_lastTimestamp) > i_interval;
        bool isOpen = s_raffleState == RaffleState.OPEN;
        bool hasBalance = address(this).balance > 0;
        bool hasPlayers = s_players.length > 0;

        upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers);
        return (upkeepNeeded, hex"");
    }

    /**
     * @notice Returns the entrance fee required to join the raffle
     * @return The entrance fee in wei
     */
    function getEntranceFee() external view returns (uint256) {
        return i_entranceFee;
    }

    /**
     * @notice Returns the time interval between raffle rounds
     * @return The interval in seconds
     */
    function getInterval() external view returns (uint256) {
        return i_interval;
    }

    /**
     * @notice Returns the address of the most recent winner
     * @return The winner's address (zero address if no winner yet)
     */
    function getRecentWinner() external view returns (address) {
        return s_recentWinner;
    }

    /**
     * @notice Returns all players in the current raffle round
     * @return Array of player addresses
     */
    function getPlayers() external view returns (address payable[] memory) {
        return s_players;
    }

    /**
     * @notice Returns the current state of the raffle
     * @return Current raffle state (OPEN or CALCULATING)
     */
    function getRaffleState() external view returns (RaffleState) {
        return s_raffleState;
    }

    /**
     * @notice Returns the timestamp when the next raffle round can be triggered
     * @return Timestamp of the next valid interval
     */
    function getNextInterval() external view returns (uint256) {
        return s_lastTimestamp + i_interval;
    }
}
