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

export const registryBytecode = "0x60803460a857601f610af138819003918201601f19168301916001600160401b0383118484101760ac5780849260209460405283398101031260a857516001600160a01b0381169081900360a857600280546001600160a01b0319908116331790915560038054909116821790556040519081527fccbb340100ae0231275bbc78f96bf86cd6924bfdc95af2988f131406f33e18a090602090a1604051610a3090816100c18239f35b5f80fd5b634e487b7160e01b5f52604160045260245ffdfe6080806040526004361015610012575f80fd5b5f3560e01c90816306661abd1461088a5750806307be79fc1461077557806364f4c79414610758578063748747e6146106d157806379ce9fac1461063e5780637d8b89ff1461038f57806387f4c427146102e95780638bbd129d1461024b5780638e19899e14610199578063aced166114610171578063bf14c119146100cc5763f851a440146100a0575f80fd5b346100c8575f3660031901126100c8576002546040516001600160a01b039091168152602090f35b5f80fd5b60203660031901126100c8576004355f81815260208190526040902080546001600160a01b03161561016257600101805460601c6001600160801b0390811634821601929190831161014e5782610122916108d1565b604080513481526001600160801b03909316602084015233925f5160206109db5f395f51905f529190a3005b634e487b7160e01b5f52601160045260245ffd5b6319eb236f60e11b5f5260045ffd5b346100c8575f3660031901126100c8576003546040516001600160a01b039091168152602090f35b346100c85760203660031901126100c8576004355f818152602081905260409020546001600160a01b0316801561016257330361023c575f81815260208181526040918290206001018054600160601b600160e01b03198116909155915160609290921c6001600160801b031680835261023a93909233927f04eda370f8b8612fa7266d7ebbd41af9d694e19793fe9d9ff31b3ddbd99b08e191a33361095a565b005b6330cd747160e01b5f5260045ffd5b346100c85760203660031901126100c8576004355f525f60205261010060405f206002600182549201548260e01c906040519360018060a01b038116855260018060401b039060a01c16602085015263ffffffff8116604085015263ffffffff8160201c16606085015263ffffffff8160401c16608085015260018060801b039060601c1660a084015260018116151560c0840152161560e0820152f35b346100c85760403660031901126100c857600435602435801515908181036100c8575f838152602081905260409020546001600160a01b0316801561016257330361023c577f551260078789c3a1f2c42c69684a311278948084004c5dd68765824554e1ecde91610375602092855f525f845260405f20905f1461037e5760fd815460e01c169061091d565b604051908152a2005b600260ff825460e01c16179061091d565b60c03660031901126100c8576004356024356001600160401b038116908190036100c85760443563ffffffff81168091036100c85760643591821515918284036100c8576084356001600160401b0381116100c8576103f29036906004016108a4565b909390929060a4356001600160401b0381116100c8576104169036906004016108a4565b909683158015610636575b610627575f898152602081905260409020546001600160a01b0316610618574363ffffffff169015610611576003905b620189c081019163ffffffff831161014e5760405160e08101906001600160401b038211818310176105fd5761056194899463ffffffff8f95819461052760ff6001938f6105519a60405233855260208501908152826040860192168252606085019c8d52608085019788528660a086019916895260c085019b868060801b0334168d525f525f60205260405f2094868060a01b0390878060a01b0390511616868060a01b0319865416178555518454908660a01b8760e01b039060a01b16908660a01b8760e01b03191617845551168261091d565b97519701805492516001600160401b0319909316919097161790831660201b1785555116836108fa565b516001600160801b0316906108d1565b6001545f19811461014e5788967f2551d7ba8242abcbb3ea09b0c10d0ebc363fbaaead64d181954136b15e269ac4966105d19460016105c1940160015560405197889788526020880152604087015260a0606087015260a086019161093a565b908382036080850152339761093a565b0390a3346105db57005b604051903482523460208301525f5160206109db5f395f51905f5260403393a3005b634e487b7160e01b5f52604160045260245ffd5b5f90610451565b630ea075bf60e21b5f5260045ffd5b63067b6a0f60e01b5f5260045ffd5b508415610421565b346100c85760403660031901126100c8576024356001600160a01b03811690600435908290036100c8575f818152602081905260409020546001600160a01b0316801561016257330361023c575f81815260208190526040812080546001600160a01b031916841790553391907f7b97c62130aa09acbbcbf7482630e756592496f1759eaf702f469cf64dfb77949080a4005b346100c85760203660031901126100c8576004356001600160a01b038116908190036100c8576002546001600160a01b0316330361074957600380546001600160a01b031916821790556040519081527fccbb340100ae0231275bbc78f96bf86cd6924bfdc95af2988f131406f33e18a090602090a1005b637bfa4b9f60e01b5f5260045ffd5b346100c8575f3660031901126100c8576020604051620189c08152f35b346100c85760603660031901126100c85760043560243563ffffffff8116918282036100c85760035460443592906001600160a01b0316330361087b575f82815260208190526040902080546001600160a01b03161561016257600101805460601c6001600160801b031680851161086c576001600160801b038581169091039290831161014e5761023a9561081063ffffffff94846108d1565b83835460401c161061085c575b505460401c16906040519182528260208301527f109a6c84e2513fc81705e0851c1d989712aacaabbcac27da99f49a435f0732a560403393a33361095a565b61086690826108fa565b8561081d565b634c6d527d60e01b5f5260045ffd5b631ea2564f60e31b5f5260045ffd5b346100c8575f3660031901126100c8576020906001548152f35b9181601f840112156100c8578235916001600160401b0383116100c857602083818601950101116100c857565b8054600160601b600160e01b03191660609290921b600160601b600160e01b0316919091179055565b805463ffffffff60401b191660409290921b63ffffffff60401b16919091179055565b805460ff60e01b191660e09290921b60ff60e01b16919091179055565b908060209392818452848401375f828201840152601f01601f1916010190565b81156109d6575f918291829182916001600160a01b03165af13d156109d1573d6001600160401b0381116105fd5760405190601f8101601f19908116603f011682016001600160401b038111838210176105fd5760405281525f60203d92013e5b156109c257565b6312171d8360e31b5f5260045ffd5b6109bb565b505056fe4bcda3b85131fc5aa24f415efaad370efc678d3800457997c2fc2af2957a3557a2646970667358221220b68bed0a1ef1354e3a0a07d9c6b4dcee30e9e3fd3dd2a7f056b527189c831d6b64736f6c634300081c0033" as const;
