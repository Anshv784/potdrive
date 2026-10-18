// Generated from contracts/out by scripts/gen-abi.ts (forge build, via-ir, runs=1). Do not edit.

export const registryAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "keeper_",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "feeCap_",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "RENEW_WINDOW",
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
    "name": "claimRenewal",
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
    "name": "feeCap",
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
    "name": "files",
    "inputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "size",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "flags",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "kind",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "chunks",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "storedAt",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "expiresAt",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "rootLen",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "keepAlive",
        "type": "uint128",
        "internalType": "uint128"
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
        "name": "u",
        "type": "tuple",
        "internalType": "struct Upload",
        "components": [
          {
            "name": "rootNode",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "leaf",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "leafSize",
            "type": "uint64",
            "internalType": "uint64"
          }
        ]
      },
      {
        "name": "m",
        "type": "tuple",
        "internalType": "struct Meta",
        "components": [
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
        ]
      },
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "signer",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "root",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "payable"
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
      },
      {
        "name": "feeCap_",
        "type": "uint256",
        "internalType": "uint256"
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
    "name": "setSponsor",
    "inputs": [
      {
        "name": "sponsor_",
        "type": "address",
        "internalType": "address"
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
    "name": "sponsor",
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
      },
      {
        "name": "feeCap",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
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
      },
      {
        "name": "proven",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      },
      {
        "name": "signer",
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
    "name": "SponsorChanged",
    "inputs": [
      {
        "name": "sponsor",
        "type": "address",
        "indexed": false,
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
    "name": "BadExpiry",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BadLink",
    "inputs": [
      {
        "name": "index",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
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
    "name": "Malformed",
    "inputs": [
      {
        "name": "offset",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "NotAdmin",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotCanonical",
    "inputs": [
      {
        "name": "index",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
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
    "name": "OverCap",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SizeMismatch",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TooEarly",
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
  },
  {
    "type": "error",
    "name": "Unsupported",
    "inputs": [
      {
        "name": "unixfsType",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "BadLink",
    "inputs": [
      {
        "name": "index",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "Malformed",
    "inputs": [
      {
        "name": "offset",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "NotCanonical",
    "inputs": [
      {
        "name": "index",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "SizeMismatch",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Unsupported",
    "inputs": [
      {
        "name": "unixfsType",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  }
] as const;

export const registryBytecode = "0x60803460b657601f6115f338819003918201601f19168301916001600160401b0383118484101760ba57808492604094855283398101031260b65780516001600160a01b038116919082900360b657602090810151600380546001600160a01b031990811633179091556006829055600480549091168417905560408051938452918301527fd77a95c8c27764df0499b07db2b7f54c1e2730445c60d75497e5f559c2d0c43891a160405161152490816100cf8239f35b5f80fd5b634e487b7160e01b5f52604160045260245ffdfe6080806040526004361015610012575f80fd5b5f3560e01c90816306661abd146111f357508063075b6e33146111d65780630c08ab38146111865780631981cfd71461116a5780632cf6e08e146111325780634051db5f1461077e5780634b866e06146105e6578063570521541461055e57806359753fb1146104d85780636029b42d1461042957806364f4c7941461040c57806377c93662146103e457806379ce9fac1461037957806387f4c427146102f85780638e19899e1461028957806398c9adff146101e7578063aced1661146101bf578063bf14c119146101195763f851a440146100ed575f80fd5b34610115575f366003190112610115576003546040516001600160a01b039091168152602090f35b5f80fd5b6020366003190112610115576004355f81815260208190526040902080546001600160a01b0316156101b05760010190815460801c60018060801b033416019160018060801b03831161019c5782610170916112d5565b604080513481526001600160801b03909316602084015233925f5160206115045f395f51905f529190a3005b634e487b7160e01b5f52601160045260245ffd5b6319eb236f60e11b5f5260045ffd5b34610115575f366003190112610115576004546040516001600160a01b039091168152602090f35b34610115576020366003190112610115576004355f525f60205261012060405f206001815491015460ff6040519260018060a01b038116845260018060401b038160a01c166020850152818160e01c16604085015260e81c16606083015263ffffffff8116608083015263ffffffff8160201c1660a083015263ffffffff8160401c1660c083015263ffffffff8160601c1660e083015260801c610100820152f35b34610115576020366003190112610115576102f660043560016102ab826113f8565b0180546001600160801b03811690915560405160809190911c8082529133917f04eda370f8b8612fa7266d7ebbd41af9d694e19793fe9d9ff31b3ddbd99b08e190602090a3336113a2565b005b346101155760403660031901126101155760043560243580151590818103610115577f551260078789c3a1f2c42c69684a311278948084004c5dd68765824554e1ecde9161035f60209261034b866113f8565b90156103685760fd815460e01c16906112b8565b604051908152a2005b600260ff825460e01c1617906112b8565b3461011557604036600319011261011557600435610395611223565b61039e826113f8565b80546001600160a01b0319166001600160a01b039290921691821790559033907f7b97c62130aa09acbbcbf7482630e756592496f1759eaf702f469cf64dfb77945f80a4005b34610115575f366003190112610115576005546040516001600160a01b039091168152602090f35b34610115575f366003190112610115576020604051620189c08152f35b3461011557606036600319011261011557600435610445611223565b604435916001600160401b0383116101155736602384011215610115576004830135916001600160401b038311610115573660248486010111610115576104d37fa3baa911eabee1cef693e9f36fb89576060e36d3f922fb9e7a336b809604f3fc916104b0846113f8565b506040519182916020835260018060a01b03169633966024602085019201611329565b0390a4005b34610115576020366003190112610115576104f161120d565b6003546001600160a01b0316330361054f57600580546001600160a01b0319166001600160a01b0390921691821790556040519081527f3654ca7211e97c8221a546197d9931904737314c63260b2cae1896803967930f90602090a1005b637bfa4b9f60e01b5f5260045ffd5b346101155760403660031901126101155761057761120d565b60035460243591906001600160a01b0316330361054f576006829055600480546001600160a01b0319166001600160a01b0390921691821790556040805191825260208201929092527fd77a95c8c27764df0499b07db2b7f54c1e2730445c60d75497e5f559c2d0c4389190a1005b346101155760603660031901126101155760243560043563ffffffff82168083036101155760045460443592906001600160a01b0316330361076f575f818152602081905260409020805494906001600160a01b038616156101b05761708043019081431161019c576001019586549163ffffffff8360401c1680911061076057851180159061074b575b61073c5761069690606083901c63ffffffff169060a01c6001600160401b0316611349565b6006549081810291818304149015171561019c57851161072d5760801c80851161071e576001600160801b038581169091039190821161019c57856106e16106e6936102f6986112d5565b6112f8565b6040519182528260208301527f109a6c84e2513fc81705e0851c1d989712aacaabbcac27da99f49a435f0732a560403393a3336113a2565b634c6d527d60e01b5f5260045ffd5b63342fa66d60e01b5f5260045ffd5b63f4ad9a1f60e01b5f5260045ffd5b50620189c0430180431161019c578511610671565b63085de62560e01b5f5260045ffd5b631ea2564f60e31b5f5260045ffd5b6080366003190112610115576004356001600160401b038111610115578060040160606003198336030112610115576001600160401b03602435116101155760806024353603600319011261011557604435916001600160a01b0383168303610115576005546064359392906001600160a01b03163303611127575b8061080491611239565b61081561081082611290565b61126b565b91818352368282011161011557815f92602092838601378301015260448201356001600160401b0381168103610115579360015f956108586024356004016112ab565b15611120576003955b60248796013596855180610a88575b50506001600160401b038216918215610a79575f888152602081905260409020805490996001600160a01b038216610a6a5760ff60e81b1990911660e89190911b60ff60e81b161789556108c4878a6112b8565b88546001600160e01b03191660a09190911b600160a01b600160e01b0316176001600160a01b0382161788554363ffffffff908116620189c0019490851161019c5760209861096c7f61dd1eb382110018e75e5d6cb1db9f9a043b8e6ad5a9407ec7de2ce85bd204479660018b995193019261094860018060801b033416856112d5565b835463ffffffff60601b191660609190911b63ffffffff60601b16178355826112f8565b80546001600160401b0319164363ffffffff9081168c1b919091179516948517905560025461099a9061131b565b6002556004610a116109af60243583016112ab565b610a036109c460248035016024358601611239565b91906109d96044602435016024358801611239565b9390946040519b8c9b8c5260208c0152151560408b015261010060608b01526101008a0191611329565b918783036080890152611329565b6024356064013560a08601529716151560c084015260e08301526001600160a01b0316940390a334610a46575b604051908152f35b6040513481523483820152815f5160206115045f395f51905f5260403393a3610a3e565b630ea075bf60e21b5f5260045ffd5b63067b6a0f60e01b5f5260045ffd5b9398509650945050604051906363effb4360e11b8252602060048301528060248301525f5b81811061110a575081815f60448194602096010152601f8019910116604401906109005afa601f3d111615610115575f5160405195909490606087016001600160401b038111888210176110f6576040525f87525f60208801525f6040880152835190602682049181830180931161019c57610b2b61081084611356565b92808452610b3b601f1991611356565b013660208501375f905f925f915f5b818110610f33575082158015610f2b575b610f19575063ffffffff831660408c01525f94859485935f19915b818110610e1757505060028103610c0357505050148015918391610bf8575b50508015610bf0575b610be1576001600160401b03166020870152600286525b60018060401b0360208701511690600460ff63ffffffff60408a01511698511697929117948880610870565b6399c3c3f360e01b5f5260045ffd5b508015610b9e565b141590508189610b95565b9250935080945081145f14610e065750905f915f915b818310610c38575050506001600160401b031660208801528652610bb5565b91929091906001600160401b03610c4f858461136d565b5160481c16610c5e858461136d565b5160881c908115610df357908692915f5b828110610db6575086610ca9575b5050610ca090610c8d868561136d565b5160081c6001600160401b031690611349565b93019190610c19565b919250905f19860186811161019c578791610cdb6001600160401b03610ccf848961136d565b5160481c16928761136d565b5160881c835f945b610d57575b508303610d13575050145b610d005784908c80610c7d565b83633a128c7360e01b5f5260045260245ffd5b9190928114928315610d28575b505050610cf3565b602080939450610d3c83610d489493611349565b8d0101515f1a93611349565b8a0101515f1a108c8080610d20565b9385811080610dad575b80610d82575b15610d7c57610d759061131b565b9380610ce3565b93610ce8565b508d602080610d918488611349565b830101515f1a91610da28487611349565b0101515f1a14610d67565b50818110610d61565b9091929350602f6020610dc98385611349565b8d0101515f1a14610de05787019087939291610c6f565b86633a128c7360e01b5f5260045260245ffd5b85633a128c7360e01b5f5260045260245ffd5b6228367f60e21b5f5260045260245ffd5b81610e22918d61142a565b9491878492941480610f11575b15610e495750505082610e42918d61148b565b5091610b76565b6003829c93969c149081610f08575b5015610e7257505088610e6b918d61148b565b5097610b76565b90999190600414610e84575b50610b76565b8c828210610e925750610e7e565b610ea09183919a989a61148b565b96888a10801590610ef0575b8015610ed0575b610be157610eca91610ec491611349565b9861131b565b95610e84565b5081610edc8b8861136d565b5160081c6001600160401b03161415610eb3565b50605560ff610eff8c8961136d565b51161415610eac565b9050155f610e58565b508015610e2f565b6345ef413360e01b5f5260045260245ffd5b508315610b5b565b936002610f4183878d61142a565b989291939093036110e357600281036110ba5750505f905f905b878110610f96575015610f835790610f7d91610f77828a61136d565b5261131b565b93610b4a565b506309d56c8d60e11b5f5260045260245ffd5b90918c610fa489848361142a565b96928a819793929714806110b0575b1561103b5750505050826020910101516026610fd660ff8360f01c169486611395565b149081159161101f575b508015611008575b610ff55717908490610f5b565b836309d56c8d60e11b5f5260045260245ffd5b5060558214158015610fe857506070821415610fe8565b60d01c65ff00ffffffff16650100a0e40220141590505f610fe0565b90919295935060028114806110a6575b1561106c5750505061105d8185611395565b60881b9060481b171791610f5b565b600314908161109d575b5015610f19575083611088918f61148b565b5060081b610100600160481b03161791610f5b565b9050155f611076565b506002821461104b565b5060028214610fb3565b8591939798509591951490816110da575b5015610f195750849294610b4a565b9050158e6110cb565b506345ef413360e01b5f5260045260245ffd5b634e487b7160e01b5f52604160045260245ffd5b8060208092870101516044828601015201610aad565b5f95610861565b5f93503392506107fa565b34610115576020366003190112610115576001600160a01b0361115361120d565b165f526001602052602060405f2054604051908152f35b34610115575f3660031901126101155760206040516170808152f35b3461011557602036600319011261011557600435335f5260016020528060405f20556040519081527f13a427858eda622805a03fd2195c70454b6e1a9ae8df85ddb89bcd79ad97db8560203392a2005b34610115575f366003190112610115576020600654604051908152f35b34610115575f366003190112610115576020906002548152f35b600435906001600160a01b038216820361011557565b602435906001600160a01b038216820361011557565b903590601e198136030182121561011557018035906001600160401b0382116101155760200191813603831361011557565b6040519190601f01601f191682016001600160401b038111838210176110f657604052565b6001600160401b0381116110f657601f01601f191660200190565b3580151581036101155790565b805460ff60e01b191660e09290921b60ff60e01b16919091179055565b80546001600160801b031660809290921b6001600160801b031916919091179055565b805463ffffffff60401b191660409290921b63ffffffff60401b16919091179055565b5f19811461019c5760010190565b908060209392818452848401375f828201840152601f01601f1916010190565b9190820180921161019c57565b6001600160401b0381116110f65760051b60200190565b80518210156113815760209160051b010190565b634e487b7160e01b5f52603260045260245ffd5b9190820391821161019c57565b81156113f4575f918291829182916001600160a01b03165af13d156113ef573d6113ce61081082611290565b9081525f60203d92013e5b156113e057565b6312171d8360e31b5f5260045ffd5b6113d9565b5050565b5f525f60205260405f209060018060a01b0382541680156101b057330361141b57565b6330cd747160e01b5f5260045ffd5b909261143783858461148b565b8094919493600786169560031c96600287145f146114755750829394509061145f929161148b565b61146b81949282611349565b928311610f195750565b86610f19575090611486929161148b565b905090565b90925f5f5b604081106114ac575b856345ef413360e01b5f5260045260245ffd5b848610156114fe57608060206114c18861131b565b97860101515f1a92607f8416831b1792106114f657600781018091111561149057634e487b7160e01b5f52601160045260245ffd5b509392509050565b61149956fe4bcda3b85131fc5aa24f415efaad370efc678d3800457997c2fc2af2957a3557" as const;

export const permitsAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "registry_",
        "type": "address",
        "internalType": "contract IRegistry"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "nonces",
    "inputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "permitText",
    "inputs": [
      {
        "name": "u",
        "type": "tuple",
        "internalType": "struct Upload",
        "components": [
          {
            "name": "rootNode",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "leaf",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "leafSize",
            "type": "uint64",
            "internalType": "uint64"
          }
        ]
      },
      {
        "name": "m",
        "type": "tuple",
        "internalType": "struct Meta",
        "components": [
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
        ]
      },
      {
        "name": "signer",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "deadline",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "extra",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "register",
    "inputs": [
      {
        "name": "u",
        "type": "tuple",
        "internalType": "struct Upload",
        "components": [
          {
            "name": "rootNode",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "leaf",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "leafSize",
            "type": "uint64",
            "internalType": "uint64"
          }
        ]
      },
      {
        "name": "m",
        "type": "tuple",
        "internalType": "struct Meta",
        "components": [
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
        ]
      },
      {
        "name": "signer",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "deadline",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "signature",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "extra",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "registry",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IRegistry"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "error",
    "name": "BadSignature",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BadText",
    "inputs": []
  },
  {
    "type": "error",
    "name": "PermitExpired",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BadText",
    "inputs": []
  }
] as const;

export const permitsBytecode = "0x60a034607457601f61101038819003918201601f19168301916001600160401b03831184841017607857808492602094604052833981010312607457516001600160a01b0381168103607457608052604051610f83908161008d823960805181818161013a0152818161043e01526104bc0152f35b5f80fd5b634e487b7160e01b5f52604160045260245ffdfe6080806040526004361015610012575f80fd5b5f3560e01c9081637b103999146104aa575080639a29c07d146103745780639e317f12146103435763d227a19e14610048575f80fd5b60c03660031901126102ed576004356001600160401b0381116102ed578060040190606060031982360301126102ed57602435906001600160401b0382116102ed5781600401608060031984360301126102ed576044356100a76104eb565b916084356001600160401b0381116102ed576100c79036906004016104fe565b9360a4356001600160401b0381116102ed576100e79036906004016104fe565b95909263ffffffff83164311610334576101018a8061052b565b1590506103275761012461011f6101188c8061052b565b36916105af565b610637565b906070915b5f88815260208190526040902080547f00000000000000000000000000000000000000000000000000000000000000006001600160a01b03169a919790966001600160401b03808916908114610313576001600160401b0319909816600189016001600160401b0316179098556101ba978a976101b5966101ad958e918d916106af565b9236916105af565b610d21565b15610304576101c882610dd1565b9460446101fd6101ec60405199634051db5f60e01b8b52608060048c0152806105e5565b606060848c015260e48b0191610617565b602487013560a48a01529501356001600160401b038116908190036102ed5760c48801526003198786030160248801528135928315158094036102ed57602096866060606461028b8c9a978b998a995261027d61027261026060248b01846105e5565b60206080908a01526080890191610617565b9160448a01906105e5565b908683036040880152610617565b9501359101526001600160a01b031660448401526064830152039134905af180156102f9575f906102c2575b602090604051908152f35b506020813d6020116102f1575b816102dc6020938361055d565b810103126102ed57602090516102b7565b5f80fd5b3d91506102cf565b6040513d5f823e3d90fd5b635cd5d23360e01b5f5260045ffd5b634e487b7160e01b5f52601160045260245ffd5b6055906024890135610129565b63068568f360e21b5f5260045ffd5b346102ed5760203660031901126102ed576004355f525f602052602060018060401b0360405f205416604051908152f35b346102ed5760a03660031901126102ed576004356001600160401b0381116102ed578060040190606060031982360301126102ed57602435906001600160401b0382116102ed57608060031983360301126102ed576103d16104eb565b92608435916001600160401b0383116102ed576020946040946103fb6104709536906004016104fe565b949093610408828061052b565b15905061049c575061011f610118826104209361052b565b906070915b6044355f908152808a52889020545f1960018a1b0116927f00000000000000000000000000000000000000000000000000000000000000006001600160a01b031692600401916106af565b815192839181835280519182918282860152018484015e5f828201840152601f01601f19168101030190f35b605592915060240135610425565b346102ed575f3660031901126102ed577f00000000000000000000000000000000000000000000000000000000000000006001600160a01b03168152602090f35b6064359063ffffffff821682036102ed57565b9181601f840112156102ed578235916001600160401b0383116102ed57602083818601950101116102ed57565b903590601e19813603018212156102ed57018035906001600160401b0382116102ed576020019181360383136102ed57565b601f909101601f19168101906001600160401b0382119082101761058057604052565b634e487b7160e01b5f52604160045260245ffd5b6001600160401b03811161058057601f01601f191660200190565b9291926105bb82610594565b916105c9604051938461055d565b8294818452818301116102ed578281602093845f960137010152565b9035601e19823603018112156102ed570160208101919035906001600160401b0382116102ed5781360383136102ed57565b908060209392818452848401375f828201840152601f01601f1916010190565b80516040516363effb4360e11b81526020600482015260248101829052915f5b82811061068c57505081815f60448194602096010152601f8019910116604401906109005afa601f3d1116156102ed575f5190565b8060208092840101516044828701015201610657565b9190820180921161031357565b9790929391949596602086016106c5818861052b565b90506101e00198896101e011610313576106f9836106f46106ec9c60408c019d8e8d61052b565b9190506106a2565b6106a2565b986107038a610594565b996107116040519b8c61055d565b808b52610720601f1991610594565b013660208c013789958a60405161073860608261055d565b60308082527f3c42797465733e506f7444726976653a2073746f726520616e6420726567697360208301526f03a32b91030903334b6328531b4b21d160851b60408301529182915f5b838110610d0557505081602091606293500101536001810180911161031357604051600160f81b602082015260f89990991b6001600160f81b03191660218a0152630507201160e51b60228a01526026808a019e909e529c88529798976107e960468961055d565b5f998a998a5b8a518d101561087a5760208d8c01015160f81c9060081b179a60088101809111610313579b5b60058d1015610828576001019b9a6107ef565b9e6004198d019c8d1161031357601f8c8e1c16602081101561086657610860918f915f516020610f635f395f51905f52901a91610f4b565b9e610815565b634e487b7160e01b5f52603260045260245ffd5b92979d93989e949950949990959a508015155f14610cf057600503906005821161031357601f911b1660208110156108665761093b6109156108d38d610949965f516020610f635f395f51905f52610942961a91610f4b565b9a5b8d61090d61090660409e8f906108ed8251928361055d565b600782526553730b6b29d160cd1b602083015284610e1d565b928961052b565b929091610e54565b8a51906109228c8361055d565b600782526553a3cb8329d160cd1b60208301528d610e1d565b918461052b565b918b610e54565b813580151581036102ed576060916109989115610cbb57885161096c8a8261055d565b60188152765383934bb30ba329d103cb2b985383932bb34b7bab99d160451b6020820152905b8b610e1d565b91013580610bee5750610a006109cf610a33928851906109b88a8361055d565b60048252636e6f6e6560e01b60208301528b610e1d565b9189918894935b8551906109e3878361055d565b600b82526953932b3b4b9ba393c9d160ad1b602083015284610e1d565b845160609490941b6001600160601b0319169390610a1e868361055d565b6002825261060f60f31b602083015283610e1d565b915f905b60148210610b6d575050610b019493610ab3610a8c610a8463ffffffff9686610ac596610af89850610a6b8351938461055d565b6008835266531b430b4b71d160c51b6020840152610e1d565b46908d610eda565b895190610a998b8361055d565b600882526653737b731b29d160c51b60208301528c610e1d565b6001600160401b03909116908a610eda565b865190610ad2888361055d565b601482527253b30b634b2103ab73a34b610313637b1b59d160651b602083015289610e1d565b91169086610eda565b9083610b39575b50610b359250610b1a8251928361055d565b60088252671e17a13cba32b99f60c11b602083015283610e1d565b9052565b90600a602082870101536001810180911161031357610b60610b6792610b359536916105af565b9085610e1d565b5f610b08565b929150925060208310156108665781831a9060ff8260041c16601081101561086657600f91610bb3916f181899199a1a9b1b9c1cb0b131b232b360811b901a908c610f4b565b9116601081101561086657600191610be2916f181899199a1a9b1b9c1cb0b131b232b360811b901a908b610f4b565b92018890879392610a37565b96939080610c21919b97949b9a96939a50845190610c0c868361055d565b6002825261060f60f31b60208301528a610e1d565b995f9a5b60208c1015610c9d57888c1a9060ff8260041c16601081101561086657600f91610c66916f181899199a1a9b1b9c1cb0b131b232b360811b901a908d610f4b565b9116601081101561086657600191610c95916f181899199a1a9b1b9c1cb0b131b232b360811b901a908c610f4b565b9b019a610c25565b610a009194979b50610a3392959850999295999189918894936109d6565b8851610cc78a8261055d565b60178152755383934bb30ba329d10373785383932bb34b7bab99d1604d1b602082015290610992565b505061094261093b610915610949949a6108d5565b9092506020918282818187010151920101520182918e91610781565b91906040835103610dca578051916040519363307a575d60e01b85525f5b60408110610dae575050610840610804850152610824840152816108448401525f5b828110610d9757505081815f6108648194602096010152601f801991011661086401906109005afa60015f5114601f3d11161690565b806020809284010151610864828701015201610d61565b806020600192840101515f1a60048260051b8901015201610d3f565b5050505f90565b6001600160601b0381166beeeeeeeeeeeeeeeeeeeeeeee14610e1757604051906020820190815260208252610e0760408361055d565b905190206001600160a01b031690565b60601c90565b8101918051925f5b848110610e33575050500190565b80602080928501015182828501015201610e25565b90821015610866570190565b9193925f5b818110610e7a5750610e779394610e719136916105af565b91610e1d565b90565b600560f91b6001600160f81b0319610e9383858a610e48565b3516148015610eb8575b610ea957600101610e59565b632d15049f60e11b5f5260045ffd5b50600d60f81b6001600160f81b0319610ed283858a610e48565b351614610e9d565b9190600191805b600a811015610f335750825b8015610f27575f190190610f0182846106a2565b90600a8106603001918260301161031357600a92610f1f9188610f4b565b500490610eed565b5050610e7792506106a2565b90925f198114610313576001019290600a9004610ee1565b90919082016020015360018101809111610313579056fe6162636465666768696a6b6c6d6e6f707172737475767778797a323334353637" as const;

export const verifierAbi = [
  {
    "type": "function",
    "name": "inspect",
    "inputs": [
      {
        "name": "rootNode",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [
      {
        "name": "root",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "node",
        "type": "tuple",
        "internalType": "struct UnixFs.Node",
        "components": [
          {
            "name": "kind",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "size",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "links",
            "type": "uint32",
            "internalType": "uint32"
          }
        ]
      }
    ],
    "stateMutability": "pure"
  },
  {
    "type": "function",
    "name": "proveBlock",
    "inputs": [
      {
        "name": "root",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "rootNode",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "index",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "pure"
  },
  {
    "type": "error",
    "name": "BadLink",
    "inputs": [
      {
        "name": "index",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "Malformed",
    "inputs": [
      {
        "name": "offset",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "NotCanonical",
    "inputs": [
      {
        "name": "index",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "SizeMismatch",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Unsupported",
    "inputs": [
      {
        "name": "unixfsType",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "BadLink",
    "inputs": [
      {
        "name": "index",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "Malformed",
    "inputs": [
      {
        "name": "offset",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "NotCanonical",
    "inputs": [
      {
        "name": "index",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "SizeMismatch",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Unsupported",
    "inputs": [
      {
        "name": "unixfsType",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  }
] as const;

export const verifierBytecode = "0x60808060405234601557610b9d908161001a8239f35b5f80fdfe60806040526004361015610011575f80fd5b5f3560e01c80637326beb8146105d357638c4313c11461002f575f80fd5b346105bc5760203660031901126105bc576004356001600160401b0381116105bc5761005f903690600401610643565b9061006861080e565b506040516363effb4360e11b815290602082806100898685600484016106a7565b03816109005afa9182156105c8575f9261058e575b506100ab919236916106ce565b906100b461080e565b91805190602682049160018301809311610385576100d183610923565b926100df6040519485610670565b8084526100ee601f1991610923565b013660208501375f5f915f905f5b818110610508575081158015610500575b6104ee5750604087019363ffffffff831685525f19955f965f935f965b8181106103f1575050600281036101c2575050501480159184916101b7575b505080156101af575b6101a0576001600160401b0390911660208401526002835260809263ffffffff91905b60405193845260ff8151166020850152602060018060401b0391015116604084015251166060820152f35b6399c3c3f360e01b5f5260045ffd5b508115610152565b14159050825f610149565b9250935093969450600181145f146103e0575091905f925f925b81841061020757505050506001600160401b031660208201526001815260809263ffffffff91610175565b9293919290916001600160401b0361021f868661093a565b5160481c1661022e868661093a565b5160881c9081156103cd575f5b828110610399575086610277575b505061026d60019161025b878761093a565b51838060401b039060081c169061084a565b94019291906101dc565b9291969793909495985f198a01948a8611610385576102ad6001600160401b036102a1888b61093a565b5160481c16968961093a565b5160881c995f5b8881108061037c575b80610351575b156102d6576102d19061083c565b6102b4565b929b98979396919a999495909983145f1461030d575050145b6102fa575f80610249565b84633a128c7360e01b5f5260045260245ffd5b9190928114928315610322575b5050506102ef565b60208093945061033683610342949361084a565b870101515f1a9361084a565b840101515f1a105f808061031a565b50602061035e828a61084a565b870101515f1a6020610370838a61084a565b880101515f1a146102c3565b508b81106102bd565b634e487b7160e01b5f52601160045260245ffd5b602f60206103a7838561084a565b870101515f1a146103ba5760010161023b565b87633a128c7360e01b5f5260045260245ffd5b86633a128c7360e01b5f5260045260245ffd5b6228367f60e21b5f5260045260245ffd5b816103fc918661096f565b9491600184929414806104e6575b15610424575050508261041d9186610b25565b509161012a565b6003829d93969d1490816104dd575b501561044d575050896104469186610b25565b509861012a565b909a919060041461045f575b5061012a565b81811015610459578161047591879a989a610b25565b96888a108015906104c5575b80156104a5575b6101a05761049f916104999161084a565b9861083c565b9561045f565b50816104b18b8861093a565b5160081c6001600160401b03161415610488565b50605560ff6104d48c8961093a565b51161415610481565b9050155f610433565b50801561040a565b6345ef413360e01b5f5260045260245ffd5b50821561010d565b92600261051683868961096f565b9792919390930361057b57600281036105515750509061053b818661054b948a6109d0565b610545828a61093a565b5261083c565b926100fc565b60019193969750949194149081610572575b50156104ee57508391936100fc565b9050155f610563565b506345ef413360e01b5f5260045260245ffd5b91506020823d6020116105c0575b816105a960209383610670565b810103126105bc576100ab91519161009e565b5f80fd5b3d915061059c565b6040513d5f823e3d90fd5b346105bc5760803660031901126105bc576024356001600160401b0381116105bc57610603903690600401610643565b90606435906001600160401b0382116105bc5760209261062a610639933690600401610643565b92909160443591600435610713565b6040519015158152f35b9181601f840112156105bc578235916001600160401b0383116105bc57602083818601950101116105bc57565b601f909101601f19168101906001600160401b0382119082101761069357604052565b634e487b7160e01b5f52604160045260245ffd5b90918060409360208452816020850152848401375f828201840152601f01601f1916010190565b9192916001600160401b03821161069357604051916106f7601f8201601f191660200184610670565b8294818452818301116105bc578281602093845f960137010152565b94919293946040516363effb4360e11b8152602081806107378887600484016106a7565b03816109005afa9081156105c8575f916107dc575b50036107d35761078a9361076761076c9260209536916106ce565b610857565b94905060405193849283926363effb4360e11b8452600484016106a7565b03816109005afa9081156105c8575f916107a357501490565b90506020813d6020116107cb575b816107be60209383610670565b810103126105bc57511490565b3d91506107b1565b50505050505f90565b90506020813d602011610806575b816107f760209383610670565b810103126105bc57515f61074c565b3d91506107ea565b60405190606082016001600160401b03811183821017610693576040525f6040838281528260208201520152565b5f1981146103855760010190565b9190820180921161038557565b90915f91835f5b8251908181101561091057600291610876918561096f565b939092149081610905575b50806108f3575b610893575b5061085e565b805b8281106108a2575061088d565b826001929394506108b3918661096f565b93915091146108c6575090869291610895565b95505090829395916108d7936109d0565b50600182018211610385570190602660218301515f1a92015190565b50826108fe8761083c565b9614610888565b60029150145f610881565b826309d56c8d60e11b5f5260045260245ffd5b6001600160401b0381116106935760051b60200190565b805182101561094e5760209160051b010190565b634e487b7160e01b5f52603260045260245ffd5b9190820391821161038557565b909261097c838584610b25565b8094919493600786169560031c96600287145f146109ba575082939450906109a49291610b25565b6109b08194928261084a565b9283116104ee5750565b866104ee5750906109cb9291610b25565b905090565b9392915f945f925b8281106109fc57505050156109ea5750565b6309d56c8d60e11b5f5260045260245ffd5b909195610a0a87838561096f565b9692600181969392961480610b1b575b15610aa75750505050602082840101516026610a3d60ff8360f01c169487610962565b1490811591610a8b575b508015610a74575b610a615717946001925b9091906109d8565b846309d56c8d60e11b5f5260045260245ffd5b5060558214158015610a4f57506070821415610a4f565b60d01c65ff00ffffffff16650100a0e40220141590505f610a47565b6002819b9694989b1480610b11575b15610ad757505050610ac88189610962565b60881b9060481b171795610a59565b6003149081610b08575b50156104ee575087610af39185610b25565b5060081b610100600160481b03161795610a59565b9050155f610ae1565b5060028214610ab6565b5060028214610a1a565b90925f5f5b60408110610b46575b856345ef413360e01b5f5260045260245ffd5b84861015610b985760806020610b5b8861083c565b97860101515f1a92607f8416831b179210610b90576007810180911115610b2a57634e487b7160e01b5f52601160045260245ffd5b509392509050565b610b3356" as const;

// Never deployed: run through eth_call; the constructor returns the report.
export const checkAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "block_",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "dagPb",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "signer",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "signature",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "message",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "error",
    "name": "BadLink",
    "inputs": [
      {
        "name": "index",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "Malformed",
    "inputs": [
      {
        "name": "offset",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "NotCanonical",
    "inputs": [
      {
        "name": "index",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "SizeMismatch",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Unsupported",
    "inputs": [
      {
        "name": "unixfsType",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "BadLink",
    "inputs": [
      {
        "name": "index",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "Malformed",
    "inputs": [
      {
        "name": "offset",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "NotCanonical",
    "inputs": [
      {
        "name": "index",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "SizeMismatch",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Unsupported",
    "inputs": [
      {
        "name": "unixfsType",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  }
] as const;

export const checkBytecode = "0x6080806040523461091d57610bd4803803809161001c8285610934565b8339810160a08282031261091d5781516001600160401b03811161091d5781610046918401610972565b91602081015191821515830361091d57604082015160608301519092906001600160401b03811161091d578261007d918301610972565b60808201519092906001600160401b03811161091d5761009d9201610972565b6040519094909360e085016001600160401b038111868210176108c4576040525f85525f60208601525f60408601525f60608601525f60808601525f60a08601525f60c08601526040516363effb4360e11b8152602060048201526020816044818651806024830152808589018484015e5f828201840152601f01601f191681010301816109005afa908115610929575f916108f3575b508552156108d85760405190606082016001600160401b038111838210176108c4576040525f82525f60208301525f604083015280519060268204916001830180931161039957610184836109c5565b926101926040519485610934565b8084526101a1601f19916109c5565b013660208501375f905f925f915f5b8181106107015750821580156106f9575b6106e7575063ffffffff831660408701525f94859485935f19915b8181106105ea575050600281036103cf575050501480159183916103c4575b505080156103bc575b6103ad576001600160401b03166020820152600281525b60ff8151169063ffffffff6040600180821b03602084015116920151166060860152604085015260208401525b816102c8575b824360c08201524660a082015260405160c060208201928051845260ff602082015116604084015260018060401b03604082015116606084015263ffffffff60608201511660808401526080810151151560a084015260a081015182840152015160e082015260e081526102c461010082610934565b5190f35b83519060308201809211610399576102df82610957565b916102ed6040519384610934565b8083526102fc601f1991610957565b0136602084013760408051956103128288610934565b6007808852661e213cba32b99f60c91b60208901525f5b81811061038457509596506103759561036e92916103479186610ba8565b61035382519283610934565b60088252671e17a13cba32b99f60c11b602083015284610ba8565b8252610a1f565b15156080820152805f8061024e565b80602080928b01015182828901015201610329565b634e487b7160e01b5f52601160045260245ffd5b6399c3c3f360e01b5f5260045ffd5b508015610204565b14159050815f6101fb565b925093509350600181145f146105d9575091905f925f925b81841061040957505050506001600160401b031660208201526001815261021b565b9293919290916001600160401b0361042186866109dc565b5160481c1661043086866109dc565b5160881c9081156105c6575f5b828110610592575086610479575b505061046f60019161045d87876109dc565b51838060401b039060081c16906109b8565b94019291906103e7565b9497959a91988b5f9b92989b95949519810111610399576001600160401b036104a55f198e018b6109dc565b5160481c16966104b85f198e018b6109dc565b5160881c9b5f5b8a811080610589575b8061055e575b156104e1576104dc90610a04565b6104bf565b929b949d98919a979099939c96959683145f1461051a575050145b610507575f8061044b565b84633a128c7360e01b5f5260045260245ffd5b919092811492831561052f575b5050506104fc565b6020809394506105438361054f94936109b8565b870101515f1a936109b8565b840101515f1a105f8080610527565b50602061056b828c6109b8565b890101515f1a602061057d838c6109b8565b8a0101515f1a146104ce565b508d81106104c8565b602f60206105a083856109b8565b870101515f1a146105b35760010161043d565b87633a128c7360e01b5f5260045260245ffd5b86633a128c7360e01b5f5260045260245ffd5b6228367f60e21b5f5260045260245ffd5b816105f59186610acf565b9491600184929414806106df575b1561061d57505050826106169186610b30565b50916101dc565b6003829c93969c1490816106d6575b50156106465750508861063f9186610b30565b50976101dc565b90999190600414610658575b506101dc565b81811015610652578161066e91879a989a610b30565b96888a108015906106be575b801561069e575b6103ad5761069891610692916109b8565b98610a04565b95610658565b50816106aa8b886109dc565b5160081c6001600160401b03161415610681565b50605560ff6106cd8c896109dc565b5116141561067a565b9050155f61062c565b508015610603565b6345ef413360e01b5f5260045260245ffd5b5083156101c1565b93600261070f838786610acf565b989291939093036108b157600281036108875750505f905f905b878110610764575015610751579061074b91610745828a6109dc565b52610a04565b936101b0565b506309d56c8d60e11b5f5260045260245ffd5b9091610771888388610acf565b959260018196939296148061087d575b1561080a57505050506020828701015160266107a460ff8360f01c169486610a12565b14908115916107ee575b5080156107d7575b6107c4571790600190610729565b836309d56c8d60e11b5f5260045260245ffd5b50605582141580156107b6575060708214156107b6565b60d01c65ff00ffffffff16650100a0e40220141590505f6107ae565b6002819694961480610873575b15610838575050506108298185610a12565b60881b9060481b171791610729565b600314908161086a575b50156106e75750836108549188610b30565b5060081b68ffffffffffffffff00161791610729565b9050155f610842565b5060028214610817565b5060028214610781565b600191939798509591951490816108a8575b50156106e757508492946101b0565b9050155f610899565b506345ef413360e01b5f5260045260245ffd5b634e487b7160e01b5f52604160045260245ffd5b51600160608501526001600160401b03166040840152610248565b90506020813d602011610921575b8161090e60209383610934565b8101031261091d57515f610134565b5f80fd5b3d9150610901565b6040513d5f823e3d90fd5b601f909101601f19168101906001600160401b038211908210176108c457604052565b6001600160401b0381116108c457601f01601f191660200190565b81601f8201121561091d5780519061098982610957565b926109976040519485610934565b8284526020838301011161091d57815f9260208093018386015e8301015290565b9190820180921161039957565b6001600160401b0381116108c45760051b60200190565b80518210156109f05760209160051b010190565b634e487b7160e01b5f52603260045260245ffd5b5f1981146103995760010190565b9190820391821161039957565b91906040835103610ac8578051916040519363307a575d60e01b85525f5b60408110610aac575050610840610804850152610824840152816108448401525f5b828110610a9557505081815f6108648194602096010152601f801991011661086401906109005afa60015f5114601f3d11161690565b806020809284010151610864828701015201610a5f565b806020600192840101515f1a60048260051b8901015201610a3d565b5050505f90565b9092610adc838584610b30565b8094919493600786169560031c96600287145f14610b1a57508293945090610b049291610b30565b610b10819492826109b8565b9283116106e75750565b866106e7575090610b2b9291610b30565b905090565b90925f5f5b60408110610b51575b856345ef413360e01b5f5260045260245ffd5b84861015610ba35760806020610b6688610a04565b97860101515f1a92607f8416831b179210610b9b576007810180911115610b3557634e487b7160e01b5f52601160045260245ffd5b509392509050565b610b3e565b8101918051925f5b848110610bbe575050500190565b80602080928501015182828501015201610bb056fe" as const;
