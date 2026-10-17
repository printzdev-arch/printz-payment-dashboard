/**
 * DTO Module: common
 */
const BranchDto = require("./BranchDto");
const CategoryDto = require("./CategoryDto");
const CommonDto = require("./CommonDto");
const GeneralDto = require("./GeneralDto");
const JumboXeroxDto = require("./JumboXeroxDto");
const PastDateRequestDto = require("./PastDateRequestDto");
const PrinterDto = require("./PrinterDto");
const PrinterReadingDto = require("./PrinterReadingDto");
const StockDto = require("./StockDto");
const TotalAmountDto = require("./TotalAmountDto");

module.exports = {
  ...BranchDto,
  ...CategoryDto,
  ...CommonDto,
  ...GeneralDto,
  ...JumboXeroxDto,
  ...PastDateRequestDto,
  ...PrinterDto,
  ...PrinterReadingDto,
  ...StockDto,
  ...TotalAmountDto,
  BranchDto,
  CategoryDto,
  CommonDto,
  GeneralDto,
  JumboXeroxDto,
  PastDateRequestDto,
  PrinterDto,
  PrinterReadingDto,
  StockDto,
  TotalAmountDto,
};
