/**
 * "Previous balances still to collect" view of the payments-to-be-collected records.
 *
 * Used by GET /payments?outstanding=true. It does on the server what the Previous Balances screen used to
 * do in the browser after downloading every record, so the screen can ask for one page at a time:
 *
 *   outstanding=true   keep only records that still have an amount to collect (more than zero)
 *   branch=<name>      branch name, exact, ignoring case
 *   search=<text>      text found in the branch name, the date (dd/mm/yyyy), "pending", or the amounts
 *
 * Each record is returned with a `branchName`: the one stored on the record if there is one, otherwise the
 * name of its branch, so the screen never has to show a blank branch.
 */
const DISPLAY_TIME_ZONE = "Asia/Kolkata"; // the dd/mm/yyyy used for searching matches what staff see

const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isOutstandingRequest = (filters = {}) => String(filters.outstanding).toLowerCase() === "true";

// A missing or non-numeric amount counts as 0, the same way the API shows it
const amountOrZero = (field) => ({ $cond: [{ $isNumber: field }, field, 0] });

const buildOutstandingPipeline = (filters = {}) => {
  const pipeline = [
    // Amount still to collect is more than zero (a missing amount never matches)
    { $match: { paymentToBeCollected: { $gt: 0 } } },
    { $lookup: { from: "branches", localField: "branchId", foreignField: "_id", as: "_branch" } },
    {
      $addFields: {
        branchName: {
          $cond: [
            { $gt: [{ $strLenCP: { $toString: { $ifNull: ["$branchName", ""] } } }, 0] },
            "$branchName",
            { $ifNull: [{ $arrayElemAt: ["$_branch.name", 0] }, ""] },
          ],
        },
      },
    },
  ];

  const branch = String(filters.branch || "").trim();
  if (branch) pipeline.push({ $match: { branchName: new RegExp(`^${escapeRegex(branch)}$`, "i") } });

  const search = String(filters.search || "").trim();
  // Every record in this view is "pending", so searching part of that word matches all of them
  if (search && !"pending".includes(search.toLowerCase())) {
    const matches = (input) => ({ $regexMatch: { input, regex: escapeRegex(search), options: "i" } });
    const hasDate = { $gt: [{ $strLenCP: { $toString: { $ifNull: ["$date", ""] } } }, 0] };
    pipeline.push({
      $addFields: {
        _dateText: {
          $dateToString: {
            format: "%d/%m/%Y",
            date: { $dateFromString: { dateString: { $cond: [hasDate, "$date", null] }, onError: null, onNull: null } },
            timezone: DISPLAY_TIME_ZONE,
            onNull: "N/A",
          },
        },
      },
    });
    pipeline.push({
      $match: {
        $expr: {
          $or: [
            matches("$branchName"),
            matches("$_dateText"),
            matches({ $toString: amountOrZero("$balance") }),
            matches({ $toString: amountOrZero("$paymentCollectedTillNow") }),
            matches({ $toString: amountOrZero("$paymentToBeCollected") }),
          ],
        },
      },
    });
  }

  // Drop the helper fields so only real record fields (plus branchName) are returned
  pipeline.push({ $project: { _branch: 0, _dateText: 0 } });
  return pipeline;
};

module.exports = { isOutstandingRequest, buildOutstandingPipeline };
