export type RelayGuardConnection = {
  apiUrl: string;
  operatorToken: string;
  signingSecret: string;
};

export const emptyConnection: RelayGuardConnection = {
  apiUrl: "",
  operatorToken: "",
  signingSecret: "",
};
