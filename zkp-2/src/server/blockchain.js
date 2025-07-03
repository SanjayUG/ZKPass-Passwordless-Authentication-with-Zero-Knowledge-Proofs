const crypto = require('crypto');

class Block {
  constructor(index, timestamp, publicKey, previousHash = '') {
    this.index = index;
    this.timestamp = timestamp;
    this.publicKey = publicKey;
    this.previousHash = previousHash;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    return crypto.createHash('sha256').update(
      this.index + this.timestamp + this.publicKey + this.previousHash
    ).digest('hex');
  }
}

class Blockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
  }

  createGenesisBlock() {
    return new Block(0, Date.now(), 'Genesis Block', '0');
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  addBlock(newBlock) {
    newBlock.previousHash = this.getLatestBlock().hash;
    newBlock.hash = newBlock.calculateHash();
    this.chain.push(newBlock);
  }
}

module.exports = { Blockchain: new Blockchain(), Block };