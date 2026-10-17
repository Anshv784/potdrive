// Generated from contracts/out (forge build, via-ir, runs=1). Do not edit.
export const registryAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "keeper_",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "RETENTION",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "admin",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "count",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "fileOf",
    "inputs": [
      {
        "name": "root",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "fund",
    "inputs": [
      {
        "name": "root",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "inboxKey",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "keeper",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "register",
    "inputs": [
      {
        "name": "root",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "size",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "chunks",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "isPrivate",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "name",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "mime",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "parent",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "renewed",
    "inputs": [
      {
        "name": "root",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "expiresAt",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "cost",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setInboxKey",
    "inputs": [
      {
        "name": "key",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setKeeper",
    "inputs": [
      {
        "name": "keeper_",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setListed",
    "inputs": [
      {
        "name": "root",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "listed",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "share",
    "inputs": [
      {
        "name": "root",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "sealedKey",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "transfer",
    "inputs": [
      {
        "name": "root",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "withdraw",
    "inputs": [
      {
        "name": "root",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "Funded",
    "inputs": [
      {
        "name": "root",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "from",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "balance",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "InboxKeySet",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "key",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "KeeperChanged",
    "inputs": [
      {
        "name": "keeper",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Listed",
    "inputs": [
      {
        "name": "root",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "listed",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Registered",
    "inputs": [
      {
        "name": "root",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "size",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "chunks",
        "type": "uint32",
        "indexed": false,
        "internalType": "uint32"
      },
      {
        "name": "isPrivate",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      },
      {
        "name": "name",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "mime",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "parent",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Renewed",
    "inputs": [
      {
        "name": "root",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "expiresAt",
        "type": "uint32",
        "indexed": false,
        "internalType": "uint32"
      },
      {
        "name": "cost",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "keeper",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Shared",
    "inputs": [
      {
        "name": "root",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "from",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "to",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "sealedKey",
        "type": "bytes",
        "indexed": false,
        "internalType": "bytes"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Transferred",
    "inputs": [
      {
        "name": "root",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "from",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "to",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Withdrawn",
    "inputs": [
      {
        "name": "root",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AlreadyRegistered",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EmptyFile",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InsufficientKeepAlive",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotAdmin",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotKeeper",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotOwner",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TransferFailed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "UnknownFile",
    "inputs": []
  }
] as const;

export const registryBytecode = "0x60803460a857601f610c7638819003918201601f19168301916001600160401b0383118484101760ac5780849260209460405283398101031260a857516001600160a01b0381169081900360a857600380546001600160a01b0319908116331790915560048054909116821790556040519081527fccbb340100ae0231275bbc78f96bf86cd6924bfdc95af2988f131406f33e18a090602090a1604051610bb590816100c18239f35b5f80fd5b634e487b7160e01b5f52604160045260245ffdfe6080806040526004361015610012575f80fd5b5f3560e01c90816306661abd146109e35750806307be79fc146108ce5780630c08ab381461087e5780632cf6e08e14610846578063565d34441461058e5780636029b42d146104e657806364f4c794146104c9578063748747e61461044357806379ce9fac146103b057806387f4c4271461030a5780638bbd129d1461026c5780638e19899e146101ba578063aced166114610192578063bf14c119146100ed5763f851a440146100c1575f80fd5b346100e9575f3660031901126100e9576003546040516001600160a01b039091168152602090f35b5f80fd5b60203660031901126100e9576004355f81815260208190526040902080546001600160a01b03161561018357600101805460601c6001600160801b0390811634821601929190831161016f578261014391610a56565b604080513481526001600160801b03909316602084015233925f516020610b605f395f51905f529190a3005b634e487b7160e01b5f52601160045260245ffd5b6319eb236f60e11b5f5260045ffd5b346100e9575f3660031901126100e9576004546040516001600160a01b039091168152602090f35b346100e95760203660031901126100e9576004355f818152602081905260409020546001600160a01b0316801561018357330361025d575f81815260208181526040918290206001018054600160601b600160e01b03198116909155915160609290921c6001600160801b031680835261025b93909233927f04eda370f8b8612fa7266d7ebbd41af9d694e19793fe9d9ff31b3ddbd99b08e191a333610adf565b005b6330cd747160e01b5f5260045ffd5b346100e95760203660031901126100e9576004355f525f60205261010060405f206002600182549201548260e01c906040519360018060a01b038116855260018060401b039060a01c16602085015263ffffffff8116604085015263ffffffff8160201c16606085015263ffffffff8160401c16608085015260018060801b039060601c1660a084015260018116151560c0840152161560e0820152f35b346100e95760403660031901126100e957600435602435801515908181036100e9575f838152602081905260409020546001600160a01b0316801561018357330361025d577f551260078789c3a1f2c42c69684a311278948084004c5dd68765824554e1ecde91610396602092855f525f845260405f20905f1461039f5760fd815460e01c1690610aa2565b604051908152a2005b600260ff825460e01c161790610aa2565b346100e95760403660031901126100e9576004356103cc610a13565b5f828152602081905260409020546001600160a01b0316801561018357330361025d575f82815260208190526040812080546001600160a01b0319166001600160a01b03939093169283179055909133917f7b97c62130aa09acbbcbf7482630e756592496f1759eaf702f469cf64dfb77949080a4005b346100e95760203660031901126100e95761045c6109fd565b6003546001600160a01b031633036104ba57600480546001600160a01b0319166001600160a01b0390921691821790556040519081527fccbb340100ae0231275bbc78f96bf86cd6924bfdc95af2988f131406f33e18a090602090a1005b637bfa4b9f60e01b5f5260045ffd5b346100e9575f3660031901126100e9576020604051620189c08152f35b346100e95760603660031901126100e957600435610502610a13565b906044356001600160401b0381116100e957610522903690600401610a29565b919092815f525f60205260018060a01b0360405f205416801561018357330361025d576105897fa3baa911eabee1cef693e9f36fb89576060e36d3f922fb9e7a336b809604f3fc916040519182916020835260018060a01b03169633966020840191610abf565b0390a4005b60e03660031901126100e9576004356024356001600160401b038116908190036100e95760443563ffffffff81168091036100e95760643590811515908183036100e9576084356001600160401b0381116100e9576105f1903690600401610a29565b939060a4356001600160401b0381116100e957610612903690600401610a29565b9190928715801561083e575b61082f575f898152602081905260409020546001600160a01b0316610820574363ffffffff169015610819576003905b620189c081019163ffffffff831161016f5760405160e0810191906001600160401b038311818410176108055761076094899463ffffffff8f958f9461072660ff61075098859860019560405233855260208501908152826040860192168252606085019c8d52608085019788528660a086019916895260c085019b868060801b0334168d525f525f60205260405f2094868060a01b0390878060a01b0390511616868060a01b0319865416178555518454908660a01b8760e01b039060a01b16908660a01b8760e01b031916178455511682610aa2565b97519701805492516001600160401b0319909316919097161790831660201b178555511683610a7f565b516001600160801b031690610a56565b600254905f19821461016f5788967f6a902d27d54a9c108d992febb2f7e0be63947c51c85dbe2255b12f4316d2d4cb966107cd9660016107bf95016002556040519a8b5260208b015260408a015260c060608a015260c0890191610abf565b918683036080880152610abf565b9260c43560a08201528033940390a3346107e357005b604051903482523460208301525f516020610b605f395f51905f5260403393a3005b634e487b7160e01b5f52604160045260245ffd5b5f9061064e565b630ea075bf60e21b5f5260045ffd5b63067b6a0f60e01b5f5260045ffd5b50841561061e565b346100e95760203660031901126100e9576001600160a01b036108676109fd565b165f526001602052602060405f2054604051908152f35b346100e95760203660031901126100e957600435335f5260016020528060405f20556040519081527f13a427858eda622805a03fd2195c70454b6e1a9ae8df85ddb89bcd79ad97db8560203392a2005b346100e95760603660031901126100e95760043560243563ffffffff8116918282036100e95760045460443592906001600160a01b031633036109d4575f82815260208190526040902080546001600160a01b03161561018357600101805460601c6001600160801b03168085116109c5576001600160801b038581169091039290831161016f5761025b9561096963ffffffff9484610a56565b83835460401c16106109b5575b505460401c16906040519182528260208301527f109a6c84e2513fc81705e0851c1d989712aacaabbcac27da99f49a435f0732a560403393a333610adf565b6109bf9082610a7f565b85610976565b634c6d527d60e01b5f5260045ffd5b631ea2564f60e31b5f5260045ffd5b346100e9575f3660031901126100e9576020906002548152f35b600435906001600160a01b03821682036100e957565b602435906001600160a01b03821682036100e957565b9181601f840112156100e9578235916001600160401b0383116100e957602083818601950101116100e957565b8054600160601b600160e01b03191660609290921b600160601b600160e01b0316919091179055565b805463ffffffff60401b191660409290921b63ffffffff60401b16919091179055565b805460ff60e01b191660e09290921b60ff60e01b16919091179055565b908060209392818452848401375f828201840152601f01601f1916010190565b8115610b5b575f918291829182916001600160a01b03165af13d15610b56573d6001600160401b0381116108055760405190601f8101601f19908116603f011682016001600160401b038111838210176108055760405281525f60203d92013e5b15610b4757565b6312171d8360e31b5f5260045ffd5b610b40565b505056fe4bcda3b85131fc5aa24f415efaad370efc678d3800457997c2fc2af2957a3557a2646970667358221220b591358dec7256538eedccf6aad67427c0939ad562762a797e95f0b447e5e76164736f6c634300081c0033" as const;
