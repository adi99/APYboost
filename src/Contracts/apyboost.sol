// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Interface for ERC20 tokens (sTRX)
interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

// JustLend's Comptroller interface for claiming rewards
interface IComptroller {
    function enterMarkets(address[] calldata mTokens) external returns (uint256[] memory);
    function claimReward(uint8 rewardType, address[] calldata mTokens) external;
}

// @dev Interface for JustLend's jERC20 Token (for sTRX)
interface IjToken {
    function mint(uint mintAmount) external returns (uint);
    function borrow(uint borrowAmount) external returns (uint);
    function repayBorrow(uint repayAmount) external returns (uint);
    function redeem(uint redeemTokens) external returns (uint);
    function borrowBalanceCurrent(address account) external returns (uint);
    function balanceOf(address owner) external view returns (uint);
}

contract YieldFarmer {
    IComptroller public comptroller;
    IjToken public jsTRX; // Use JustLend's jToken for sTRX
    IERC20 public sTRX; // sTRX token

    constructor() {
        comptroller = IComptroller(0x0B81CF71fc58313e1B379797Cf39aFAb33d3F7AB); // Comptroller address in hex format
        jsTRX = IjToken(0x5C78c77bbAD44c3EBD2088E6B7b5D5f01Bb0a8F5); // jsTRX address in hex format
        sTRX = IERC20(0xC64E69ACdE1c7b16C2a3efCdbbdAA96c3644C2b3); // sTRX address in hex format

        // Enter the sTRX market in JustLend
        address[] memory jTokens = new address[](1);
        jTokens[0] = address(jsTRX);
        comptroller.enterMarkets(jTokens);
    }
    
    function approveSTRX(uint256 amount) external {
    // Approve the contract to spend sTRX tokens on behalf of the user
    require(sTRX.approve(address(this), amount), "Approval failed");
}


    // Open a leveraged position by supplying and borrowing in a loop
   function openPosition(uint initialAmount) external {
    // Transfer sTRX tokens from user's wallet to the contract
    require(sTRX.transferFrom(msg.sender, address(this), initialAmount), "Transfer failed");

    uint nextCollateralAmount = initialAmount;
    for (uint i = 0; i < 3; ++i) {
        nextCollateralAmount = _supplyAndBorrow(nextCollateralAmount);
    }
}

    // Internal function to supply sTRX as collateral and borrow against it
    function _supplyAndBorrow(uint collateralAmount) internal returns (uint) {
        sTRX.approve(address(jsTRX), collateralAmount);
        jsTRX.mint(collateralAmount);

        uint borrowAmount = (collateralAmount * 6) / 10; // Borrow 60% of supplied collateral
        jsTRX.borrow(borrowAmount);
        return borrowAmount;
    }

    // Close the leveraged position by repaying the borrow and redeeming collateral
    function closePosition() external {
        uint borrowBalance = jsTRX.borrowBalanceCurrent(address(this));
        sTRX.approve(address(jsTRX), borrowBalance);
        jsTRX.repayBorrow(borrowBalance);

        uint balancejsTRX = jsTRX.balanceOf(address(this));
        jsTRX.redeem(balancejsTRX);
    }
}
