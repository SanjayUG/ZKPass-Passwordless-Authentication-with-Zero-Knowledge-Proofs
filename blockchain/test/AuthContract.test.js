// test/AuthContract.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AuthContract", function () {
  let AuthContract;
  let authContract;
  let owner;
  let user;

  before(async function () {
    // Deploy the AuthContract
    AuthContract = await ethers.getContractFactory("AuthContract");
    authContract = await AuthContract.deploy(); // Deploy the contract
    [owner, user] = await ethers.getSigners(); // Get signers (accounts)
  });

  it("Should register a public key", async function () {
    const publicKey = "0x2736618683226954659578195063394199262002530463233621386471139967428417706049";

    // Register the public key
    await authContract.registerUser(publicKey);

    // Check if the public key is registered
    const isRegistered = await authContract.isPublicKeyRegistered(publicKey);
    expect(isRegistered).to.equal(true);
  });

  it("Should not allow duplicate public keys", async function () {
    const publicKey = "0x2736618683226954659578195063394199262002530463233621386471139967428417706049";

    // Attempt to register the same public key again
    await expect(authContract.registerUser(publicKey)).to.be.revertedWith(
      "Public key already registered"
    );
  });

  it("Should return false for unregistered public keys", async function () {
    const unregisteredPublicKey = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

    // Check if the unregistered public key is registered
    const isRegistered = await authContract.isPublicKeyRegistered(unregisteredPublicKey);
    expect(isRegistered).to.equal(false);
  });
});