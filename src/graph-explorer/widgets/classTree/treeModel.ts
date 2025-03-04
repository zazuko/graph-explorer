import { FatClassModel } from "../../diagram/elements";

export interface TreeNode {
  model: FatClassModel;
  label: string;
  derived: readonly TreeNode[];
}

export const TreeNode = {
  setDerived: (node: TreeNode, derived: readonly TreeNode[]): TreeNode => ({
    ...node,
    derived,
  }),
};
