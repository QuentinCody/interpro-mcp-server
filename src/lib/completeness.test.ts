import { expect, it } from "vitest";
import { interproCompleteness } from "./completeness";

it("keeps record-page counts separate from complete query coverage", () => {
  expect(interproCompleteness({ count: 54922, next: "cursor", previous: null, results: [{ metadata: { accession: "IPR000001" } }] }))
    .toMatchObject({ complete: false, returned: 1, total_available: 54922, truncation: { reason: "page_limit" } });
  expect(interproCompleteness({ count: 1, next: null, results: [{}] })?.complete).toBe(false);
});

it("counts native checksum results without inferring analyses or duplicating input MD5s", () => {
  const md5 = "0".repeat(32);
  expect(interproCompleteness({ results: [{ md5, found: false, matches: [] }] })).toMatchObject({ complete: false, returned: 1 });
  expect(interproCompleteness({ md5, matches: [{ source: "InterPro-N" }] })).toMatchObject({ complete: false, returned: 1 });
  expect(interproCompleteness({ metadata: { accession: "IPR000001" } })).toBeUndefined();
});

it("retains bounded coverage through composed and previously staged evidence", () => {
  const page = {count:35,next:"cursor",results:[{}]};
  expect(interproCompleteness({page,note:"extra"})).toMatchObject({complete:false,returned:1,total_available:35});
  const staged = {__staged:true,_staging:{completeness:{complete:false,returned:6}}};
  expect(interproCompleteness({staged})).toMatchObject({complete:false,returned:6});
  expect(interproCompleteness({page,staged})).toMatchObject({complete:false});
  expect(interproCompleteness({page,staged})).not.toHaveProperty("returned");
});
