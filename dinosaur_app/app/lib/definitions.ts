export type geoLocation = {
  [key: string]: number[];
};

export type DinoDataType = {
  id: number;
  name: string;
  imageSrc: string;
  typeOfDinosaur: string;
  length: number;
  weight: string | number;
  diet: string;
  whenLived: string;
  foundIn: string;
  geoLocations?: Array<geoLocation[]>;
  taxonomy: string;
  namedBy: string;
  typeSpecies: string;
  description: string;
};

export type DigSiteType = {
  coordinates: [number, number];
  count: number;
};

export type ConvertedLocations = {
  [key: string]: DigSiteType;
};

export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
};

export type SignUpDataType = {
  email: string;
  password: string;
  firstname: string;
  lastname: string;
};
