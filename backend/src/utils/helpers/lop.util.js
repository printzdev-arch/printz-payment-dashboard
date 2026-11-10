// Leave / loss-of-pay rule used by payroll calculation.
//  - Approved paid leave never causes LOP, but consumes the monthly allowance.
//  - Unpaid leave always causes LOP.
//  - Unapproved absence (full day) and half-day absence cause LOP only beyond
//    the allowance left after paid leave.
//  - Weekly offs and mandatory holidays are not passed in; they are not absences.
const computeLopDays = ({
  leaveAllowance,
  paidLeaveDays = 0,
  unpaidLeaveDays = 0,
  fullDayAbsences = 0,
  halfDayAbsences = 0,
}) => {
  const remainingAllowance = Math.max(0, leaveAllowance - paidLeaveDays);
  const absenceDays = fullDayAbsences + halfDayAbsences * 0.5;
  return {
    remainingAllowance,
    lopDays: Math.max(0, absenceDays - remainingAllowance) + unpaidLeaveDays,
  };
};

module.exports = { computeLopDays };
