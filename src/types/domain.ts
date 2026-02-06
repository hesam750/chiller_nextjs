export type Chiller = {
  id: string;
  name: string;
  ip: string;
  active: boolean;
};

export type PowerLog = {
  id: string;
  unitName: string;
  action: "on" | "off";
  at: string;
  user?: string;
};
