const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('FriendtechSharesV2', function () {
  let token, shares;
  let owner, partyA, partyB, partyC, trader, addr1;
  const initialSupply = ethers.utils.parseUnits('1000000', 18); // 1,000,000 tokens

  beforeEach(async function () {
    [owner, partyA, partyB, partyC, trader, addr1] = await ethers.getSigners();

    const Token = await ethers.getContractFactory('Token');
    token = await Token.deploy(initialSupply);
    await token.deployed(); 

    const FriendtechSharesV2 = await ethers.getContractFactory('FriendtechSharesV2');
    shares = await FriendtechSharesV2.deploy();
    await shares.deployed();

    await shares.setToken(token.address);
    await shares.setFeeDestinations(partyA.address, partyB.address, partyC.address);
    await shares.setProtocolFeePercent(10);
    await shares.setSubjectFeePercent(5);

    // Assign some tokens to the trader for testing purposes
    await token.transfer(trader.address, ethers.utils.parseUnits('10000', 18));
    // Trader approves the shares contract to spend their tokens
    await token.connect(trader).approve(shares.address, ethers.utils.parseUnits('10000', 18));
  });

  describe('Ownership and Access Control', function () {
    it('Should set the right owner', async function () {
      expect(await shares.owner()).to.equal(owner.address);
    });

    it('Should only allow the owner to set fee destinations', async function () {
      await expect(shares.connect(trader).setFeeDestinations(partyA.address, partyB.address, partyC.address)).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });


  describe('ERC-20 Functionality', function () {
    it('Should handle token transfers for buying shares', async function () {
      const amountToBuy = 1;
      const traderTokenBalanceBefore = await token.balanceOf(trader.address);
      const buyPrice = await shares.getBuyPriceAfterFee(addr1.address, amountToBuy);

      // Trader buys shares
      await shares.connect(trader).buySharesWithToken(trader.address, amountToBuy);
      const traderTokenBalanceAfter = await token.balanceOf(trader.address);

      // Check if the trader's token balance decreased by the buy price
      expect(traderTokenBalanceBefore.sub(traderTokenBalanceAfter)).to.equal(buyPrice);
    });

    it('Should handle token transfers for selling shares', async function () {
      const amountToSell = 1;
      // Trader buys shares to sell
      await shares.connect(trader).buySharesWithToken(trader.address, amountToSell);
      
      // Buying another Share Because a user cannot sell his last share
      await shares.connect(trader).buySharesWithToken(trader.address, amountToSell);

      const traderTokenBalanceBefore = await token.balanceOf(trader.address);
      const sellPrice = await shares.getSellPriceAfterFee(trader.address, amountToSell);

      // Trader sells shares
      await shares.connect(trader).sellSharesForToken(trader.address, amountToSell);
      const traderTokenBalanceAfter = await token.balanceOf(trader.address);

      // Check if the trader's token balance increased by the sell price
      expect(traderTokenBalanceAfter.sub(traderTokenBalanceBefore)).to.equal(sellPrice);
    });
  });


});
