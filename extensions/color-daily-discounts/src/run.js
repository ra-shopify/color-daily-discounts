// @ts-check
import { CurrencyCode, DiscountApplicationStrategy } from "../generated/api";
const AMOUNT = "Amount"
const NEW_PRICE = "New Price"
const PERCENTAGE = "Percentage"

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 */

/**
 * @type {FunctionRunResult}
 */
const EMPTY_DISCOUNT = {
  discountApplicationStrategy: DiscountApplicationStrategy.First,
  discounts: [],
};

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {

  // Track Targets and Associated Discounts for Later
  let targets = []
  const fcnDiscounts = []
  // Color Of The Week
  const colorOfTheWeek = 'GREEN'
  console.log('Color of the Week:', colorOfTheWeek)

  // Weekly Pricing Array
  const WeeklyPricingArray = [
    {Day:'Monday', Modifier:'Percentage', Value:'20'},
    {Day:'Tuesday', Modifier:'New Price', Value:'11.49'},
    {Day:'Wednesday', Modifier:'Amount', Value:'10.50'},
    {Day:'Thursday', Modifier:'Percentage', Value:'50'},
    {Day:'Friday', Modifier:'Amount', Value:'15'},
    {Day:'Saturday', Modifier:'Percentage', Value:'10'},
    {Day:'Sunday', Modifier:'New Price', Value:'14.99'}
  ]
  console.log('Weekly Pricing Array:', JSON.stringify(WeeklyPricingArray))

  //Determine The Current Day based on the Shop Input
  const getCurrentDay = () => {
    const shopDate = input.shop.localTime.date
    const currentDate = new Date(shopDate)
    const dayOfWeekNumber = currentDate.getDay();
    const daysOfWeek = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
    return daysOfWeek[dayOfWeekNumber]
  }

  // Call Current Day Function to Get Current Day
  const currentDay = getCurrentDay()
  console.log('Current Day:', currentDay)

  // Find the Discount for the Current Day
  const todaysDiscount = WeeklyPricingArray.find(day => day.Day === currentDay)
  console.log('Today the discount is Discount:', JSON.stringify(todaysDiscount))

  // Track Modifier and discount value
  const todaysModifier = todaysDiscount?.Modifier
  const todaysValue = todaysDiscount?.Value
  
  //Set Targets
  const setDiscounts = (modifier, value) => {

    let discount
    targets = input.cart.lines
    targets = targets.filter(line => line.merchandise?.metafield.value === colorOfTheWeek) // All Products Eligible for Discounts due to color of the week
    const originalTargets = targets // Store as it would be needed for the amounts of the new price
    
    // Based on the products, return back the product id as the input to the discount function
    targets = targets.map((line) => {
      return /** @type {Target} */ ({
        // Use the cart line ID to create a discount target
        cartLine: {
          id: line.id,
        },
      });
    })    
    
    if(modifier === PERCENTAGE){ // If today is percentage based then apply the percentage discount
      discount = {
        targets,
        value:  {
          percentage: {
            value: todaysValue
          }
        }
      }

      if(targets.length > 0) // If there are no targets, we don't want to apply the discount
        fcnDiscounts.push(discount)
    }
    else if(modifier === AMOUNT){ // If today is amount based then apply the amount discount
      discount = {
        targets,
        value:  {
          fixedAmount: {
              amount: todaysValue,
              appliesToEachItem: true
          }
        }
      }
      if(targets.length > 0) // If there are no targets, we don't want to apply the discount
        fcnDiscounts.push(discount)
    }
    else if(modifier === NEW_PRICE){ // If today is new price based then apply the new price discount
      const backupTargets = targets // Need to create individual targets to apply unique discounts, so we are storing original targets into backup to then filter.
      
      backupTargets.forEach(target => {
        
        // For each line item that needs a fixed amount, we first add the line to the target
        targets = []
        targets.push(target)

        // We then calculate the discount amount based on the original price and the new price
        const originalTarget = originalTargets.find(line => line.id === target.cartLine.id)
        const discountValue = (parseFloat(originalTarget.cost.amountPerQuantity.amount) - parseFloat(todaysValue)).toFixed(2)

        // We then create the discount object and push it to the discounts array
        // Because Green items can have a price of 15$ or 250$, if we want to set the price to 5$ we need more than one discount element in our array
        // We push each one created into the fcnDiscounts array
        discount = {
          targets,
          value:  {
            fixedAmount: {
                amount: discountValue,
                appliesToEachItem: true
            }
          }
        }
        if(targets.length > 0) // If there are no targets, we don't want to apply the discount
          fcnDiscounts.push(discount)
      })
    } 
  } 

  setDiscounts(todaysModifier, todaysValue)

  if(fcnDiscounts.length > 0){
    return {
      discounts: 
        fcnDiscounts,
      discountApplicationStrategy: DiscountApplicationStrategy.First,
    };
  }
  else{
    return EMPTY_DISCOUNT
  }
};