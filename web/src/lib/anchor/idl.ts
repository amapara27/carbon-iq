/**
 * CarbonIQ Program IDL — Placeholder
 *
 * Replace this with the auto-generated IDL from `anchor build`
 * found at: anchor/target/idl/carbon_iq.json
 */

export type CarbonIq = {
  version: "0.1.0";
  name: "carbon_iq";
  instructions: [
    {
      name: "recordImpact";
      accounts: [
        { name: "proofOfImpact"; isMut: true; isSigner: false },
        { name: "user"; isMut: true; isSigner: true },
        { name: "systemProgram"; isMut: false; isSigner: false }
      ];
      args: [{ name: "co2OffsetAmount"; type: "u64" }];
    },
    {
      name: "updateImpact";
      accounts: [
        { name: "proofOfImpact"; isMut: true; isSigner: false },
        { name: "user"; isMut: true; isSigner: true }
      ];
      args: [{ name: "additionalOffset"; type: "u64" }];
    }
  ];
  accounts: [
    {
      name: "proofOfImpact";
      type: {
        kind: "struct";
        fields: [
          { name: "userWallet"; type: "publicKey" },
          { name: "co2OffsetAmount"; type: "u64" },
          { name: "timestamp"; type: "i64" },
          { name: "bump"; type: "u8" }
        ];
      };
    }
  ];
  events: [
    {
      name: "ImpactRecorded";
      fields: [
        { name: "userWallet"; type: "publicKey"; index: false },
        { name: "co2OffsetAmount"; type: "u64"; index: false },
        { name: "timestamp"; type: "i64"; index: false }
      ];
    }
  ];
  errors: [
    {
      code: 6000;
      name: "Overflow";
      msg: "Arithmetic overflow when accumulating offset.";
    }
  ];
};

export const IDL: CarbonIq = {
  version: "0.1.0",
  name: "carbon_iq",
  instructions: [
    {
      name: "recordImpact",
      accounts: [
        { name: "proofOfImpact", isMut: true, isSigner: false },
        { name: "user", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [{ name: "co2OffsetAmount", type: "u64" }],
    },
    {
      name: "updateImpact",
      accounts: [
        { name: "proofOfImpact", isMut: true, isSigner: false },
        { name: "user", isMut: true, isSigner: true },
      ],
      args: [{ name: "additionalOffset", type: "u64" }],
    },
  ],
  accounts: [
    {
      name: "proofOfImpact",
      type: {
        kind: "struct",
        fields: [
          { name: "userWallet", type: "publicKey" },
          { name: "co2OffsetAmount", type: "u64" },
          { name: "timestamp", type: "i64" },
          { name: "bump", type: "u8" },
        ],
      },
    },
  ],
  events: [
    {
      name: "ImpactRecorded",
      fields: [
        { name: "userWallet", type: "publicKey", index: false },
        { name: "co2OffsetAmount", type: "u64", index: false },
        { name: "timestamp", type: "i64", index: false },
      ],
    },
  ],
  errors: [
    {
      code: 6000,
      name: "Overflow",
      msg: "Arithmetic overflow when accumulating offset.",
    },
  ],
};
