// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

import {VRFCoordinatorV2Interface} from "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import {VRFConsumerBaseV2} from "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {ERC1155Burnable} from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract Game is VRFConsumerBaseV2, ERC1155, ERC1155Burnable, Ownable {
    /////////
    // Errors
    /////////
    error Game__YouAlreadyOwnACharacter();
    error Game__NoCharacterFound();
    error Game__CharacterAlreadyOnMission();
    error Game__CharacterStillOnMission(int256 timeLeft);
    error Game__FailedToCalculateRewards();
    error Game__YourAddressDoesnOwnAnyCharacter();
    error Game__YouDontOwnEnoughGold(uint256 weaponUpgradePrice);
    error Game__YourWeaponIsMaxUpgraded();
    error Game__WaitingForTheRandomNumber();
    error Game__OnlyMagicSwordCanBeEnchanted();

    //////////////////
    // State variables
    //////////////////
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subId;
    uint16 private immutable i_requestConfirmations;
    uint32 private immutable i_callbackGasLimit;
    mapping(address requester => uint256 requestId) addressToRequestId;
    //     private s_requestIdToAddress;
    struct RequestStatus {
        bool fulfilled; // whether the request has been successfully fulfilled
        bool exists; // whether a requestId exists
        uint256[] randomWords;
    }
    mapping(uint256 => RequestStatus) public s_requests;
    uint256 public lastRequestId;
    uint256[] public requestIds;

    string private s_uri;

    uint256 private s_character = 0;
    uint256 private s_gold = 1;
    uint256 private s_woodenSword = 2;
    uint256 private s_steelSword = 3;
    uint256 private s_magicSword = 4;
    uint256 private s_legendaryFireSword = 5;
    uint256 private s_missionTimeInSeconds = 28800;
    uint256 private s_weaponUpgradePrice;
    uint256 private s_legendaryFireSwordPrice;

    struct Character {
        bool onMission;
        uint256 missionStartTimeStamp;
        uint8 weaponLevel;
    }

    mapping(address player => Character) private character;

    /////////
    // Events
    /////////
    event CharacterCreated(address indexed requester, uint256 indexed requestId);
    event RequestFulfilled(uint256 indexed requestId, uint256[] indexed numWords);

    constructor(
        address _vrfCoordinator,
        bytes32 _gasLane,
        uint64 _subId,
        uint16 _requestConfirmations,
        uint32 _callbackGasLimit,
        uint256 _weaponUpgradePrice,
        uint256 _legendaryFireSwordPrice
    ) VRFConsumerBaseV2(_vrfCoordinator) ERC1155("") {
        i_vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
        i_gasLane = _gasLane;
        i_subId = _subId;
        i_requestConfirmations = _requestConfirmations;
        i_callbackGasLimit = _callbackGasLimit;
        s_weaponUpgradePrice = _weaponUpgradePrice;
        s_legendaryFireSwordPrice = _legendaryFireSwordPrice;
    }

    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
    }

    function createCharacter() public {
        if (character[msg.sender].weaponLevel > 0) {
            revert Game__YouAlreadyOwnACharacter();
        }
        character[msg.sender].weaponLevel = 1;
        _mint(msg.sender, s_character, 1, "");
        _mint(msg.sender, s_gold, 50, "");
        _mint(msg.sender, s_woodenSword, 1, "");
    }

    function upgradeWeaponLevel() public {
        uint256 weaponLevel = character[msg.sender].weaponLevel;
        if (weaponLevel == 0) {
            revert Game__YourAddressDoesnOwnAnyCharacter();
        }
        if (weaponLevel == 3) {
            revert Game__YourWeaponIsMaxUpgraded();
        }
        if (balanceOf(msg.sender, s_gold) < s_weaponUpgradePrice) {
            revert Game__YouDontOwnEnoughGold(s_weaponUpgradePrice);
        }
        if (weaponLevel == 1) {
            _burn(msg.sender, s_woodenSword, 1);
            _mint(msg.sender, s_steelSword, 1, "");
            _burn(msg.sender, s_gold, s_weaponUpgradePrice);
            // safeTransferFrom(msg.sender, address(this), s_gold, s_weaponUpgradePrice, "");
            character[msg.sender].weaponLevel = 2;
        } else if (weaponLevel == 2) {
            _burn(msg.sender, s_steelSword, 1);
            _mint(msg.sender, s_magicSword, 1, "");
            _burn(msg.sender, s_gold, s_weaponUpgradePrice);
            // safeTransferFrom(msg.sender, address(this), s_gold, s_weaponUpgradePrice, "");
            character[msg.sender].weaponLevel = 3;
        }
    }

    function enchantMagicWeaponToFireWeapon() public {
        if (balanceOf(msg.sender, s_gold) < s_legendaryFireSwordPrice) {
            revert Game__YouDontOwnEnoughGold(s_legendaryFireSwordPrice);
        }
        if (character[msg.sender].weaponLevel != 3) {
            revert Game__OnlyMagicSwordCanBeEnchanted();
        }
        _burn(msg.sender, s_magicSword, 1);
        _mint(msg.sender, s_legendaryFireSword, 1, "");
        _burn(msg.sender, s_gold, s_legendaryFireSwordPrice);
        // safeTransferFrom(msg.sender, address(this), s_gold, s_legendaryFireSwordPrice, "");
        character[msg.sender].weaponLevel = 4;
    }

    function sendCharacterToMission() public returns (uint256 requestId) {
        if (balanceOf(msg.sender, 0) == 0) {
            revert Game__NoCharacterFound();
        }
        if (character[msg.sender].onMission == true) {
            revert Game__CharacterAlreadyOnMission();
        }
        character[msg.sender].onMission = true;
        character[msg.sender].missionStartTimeStamp = block.timestamp;
        // Will revert if subscription is not set and funded.
        requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subId,
            i_requestConfirmations,
            i_callbackGasLimit,
            1
        );
        s_requests[requestId] = RequestStatus({
            randomWords: new uint256[](0),
            exists: true,
            fulfilled: false
        });
        addressToRequestId[msg.sender] = requestId;
        requestIds.push(requestId);
        lastRequestId = requestId;
        emit CharacterCreated(msg.sender, requestId);
    }

    function finishMission() public {
        int256 timeLeft = calculateMissionTimeLeft(msg.sender);
        if (timeLeft > 0) {
            revert Game__CharacterStillOnMission(timeLeft);
        }
        uint256 requestId = addressToRequestId[msg.sender];
        if (s_requests[requestId].fulfilled == false) {
            revert Game__WaitingForTheRandomNumber();
        }
        character[msg.sender].onMission = false;
        uint256 randomNumber = s_requests[requestId].randomWords[0] % 100;
        uint256 calculatedNumber = calculateRewards(randomNumber);
        _mint(msg.sender, s_gold, calculatedNumber, "");
    }

    function calculateRewards(uint256 _randomWord) public pure returns (uint256) {
        if (_randomWord >= 60) {
            return 20;
        } else if (_randomWord >= 30) {
            return 30;
        } else if (_randomWord >= 10) {
            return 40;
        } else if (_randomWord < 10) {
            return 60;
        } else revert Game__FailedToCalculateRewards();
    }

    function calculateMissionTimeLeft(address _playerAddress) public view returns (int256) {
        uint256 timePassed = block.timestamp - character[_playerAddress].missionStartTimeStamp;
        uint256 weaponLevel = character[_playerAddress].weaponLevel;
        uint256 missionTime = s_missionTimeInSeconds - (weaponLevel * 3600);
        int256 timeLeft = int256(missionTime) - int256(timePassed);
        return timeLeft;
    }

    // function mintGold(address _address, uint256 _amount) external onlyOwner {
    //     _mint(msg.sender, s_gold, _amount, "");
    //     _safeTransferFrom(msg.sender, _address, s_gold, _amount, "");
    // }

    function fulfillRandomWords(
        uint256 _requestId,
        uint256[] memory _randomWords
    ) internal override {
        require(s_requests[_requestId].exists, "request not found");
        s_requests[_requestId].fulfilled = true;
        s_requests[_requestId].randomWords = _randomWords;
        emit RequestFulfilled(_requestId, _randomWords);
    }

    function getVrfCoordinatorAddress() public view returns (VRFCoordinatorV2Interface) {
        return i_vrfCoordinator;
    }

    function getGasLane() public view returns (bytes32) {
        return i_gasLane;
    }

    function getSubId() public view returns (uint64) {
        return i_subId;
    }

    function getWeaponUpgradePrice() public view returns (uint256) {
        return s_weaponUpgradePrice;
    }

    function getLegendaryFireSwordPrice() public view returns (uint256) {
        return s_legendaryFireSwordPrice;
    }

    function getMissionTimeInSeconds() public view returns (uint256) {
        return s_missionTimeInSeconds;
    }

    function getRequestConfirmations() public view returns (uint16) {
        return i_requestConfirmations;
    }

    function getCallbackGasLimit() public view returns (uint32) {
        return i_callbackGasLimit;
    }

    function getCharacterWeaponLevel(address _address) public view returns (uint256) {
        return character[_address].weaponLevel;
    }

    function getCharacterMissionStatus(address _address) public view returns (bool) {
        return character[_address].onMission;
    }

    function getCharacterMissionStart(address _address) public view returns (uint256) {
        return character[_address].missionStartTimeStamp;
    }

    function getLatestRequestId() public view returns (uint256) {
        return lastRequestId;
    }

    function getRequestIds() public view returns (uint256[] memory) {
        return requestIds;
    }

    function getRequestIdByAddress() public view returns (uint256) {
        return addressToRequestId[msg.sender];
    }

    function getRequestMapping(uint256 _requestId) public view returns (RequestStatus memory) {
        return s_requests[_requestId];
    }

    function getRandomNumber(uint256 _requestId) public view returns (uint256) {
        return s_requests[_requestId].randomWords[0];
    }
}
