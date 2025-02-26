import { createContext } from "react";
import SerialConnectionData from "./serialConnectionData";

export const SerialContext = createContext(new SerialConnectionData());