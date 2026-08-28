"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQ_ITEMS } from "./faq-items";

function FaqItems() {
  return (
    <>
      {FAQ_ITEMS.map((item, itemIndex) => (
        <AccordionItem
          key={item.question}
          value={`faq-${itemIndex}`}
          className="mb-3 rounded-2xl border border-l-[6px] border-border px-5 transition-colors last:mb-0 last:border-b last:border-border data-[state=open]:rounded-l-none data-[state=open]:border-l-brand-deep! data-[state=open]:bg-[#eef7f3]"
        >
          <AccordionTrigger className="text-[15.5px] font-semibold text-brand-deep-dark hover:no-underline data-[state=open]:text-brand-deep [&>svg]:text-brand-deep-dark/50 data-[state=open]:[&>svg]:text-brand-deep">
            {item.question}
          </AccordionTrigger>
          <AccordionContent className="text-[14.5px] leading-relaxed text-gray-500">
            {item.answerNode ?? item.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </>
  );
}

export function Faq() {
  return (
    <div className="grid w-full">
      <Accordion
        type="single"
        collapsible
        defaultValue="faq-0"
        className="col-start-1 row-start-1 w-full"
      >
        <FaqItems />
      </Accordion>

      {FAQ_ITEMS.map((_, itemIndex) => (
        <Accordion
          key={itemIndex}
          type="single"
          value={`faq-${itemIndex}`}
          onValueChange={() => {}}
          aria-hidden="true"
          className="invisible col-start-1 row-start-1 w-full select-none pointer-events-none"
        >
          <FaqItems />
        </Accordion>
      ))}
    </div>
  );
}
