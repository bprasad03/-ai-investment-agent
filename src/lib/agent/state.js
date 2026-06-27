import { Annotation } from "@langchain/langgraph";

export const InvestmentState = Annotation.Root({
  companyName: Annotation(),
  researchData: Annotation({
    reducer: (_left, right) => right,
    default: () => "",
  }),
  analysis: Annotation({
    reducer: (_left, right) => right,
    default: () => "",
  }),
  decision: Annotation({
    reducer: (_left, right) => right,
    default: () => null,
  }),
});