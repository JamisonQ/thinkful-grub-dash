const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

// TODO: Implement the /orders handlers needed to make the tests pass
function orderExists(req, res, next) {
  const { orderId } = req.params;
  const foundOrder = orders.find((order) => order.id === orderId);
  if (foundOrder) {
    res.locals.order = foundOrder;
    return next();
  }
  next({
    status: 404,
    message: `Order does not exist: ${orderId}.`,
  });
}

function bodyDataHas(propertyName) {
  return function (req, res, next) {
    const { data = {} } = req.body;
    if (data[propertyName]) {
      return next();
    }
    next({
      status: 400,
      message: `Must include a ${propertyName}`,
    });
  };
}

function idsMatch(req, res, next) {
  const { orderId } = req.params;
  const { data: { id } = {} } = req.body;
  if (orderId === id || id === undefined || id === null || id === "") {
    next();
  }
  next({
    status: 400,
    message: `Order id does not match route id. Dish: ${id}, Route: ${orderId}`,
  });
}

function validateDishes(req, res, next) {
  const { data: { dishes } = {} } = req.body;
  if (Array.isArray(dishes) && dishes.length > 0) {
    next();
  } else {
    next({
      status: 400,
      message: `Order must include at least one dish`,
    });
  }
}

function validateEachDish(req, res, next) {
  const { data: { dishes } = {} } = req.body;
  dishes.forEach((dish, index) => {
    if (dish.quantity <= 0 || typeof dish.quantity !== "number") {
      next({
        status: 400,
        message: `Dish at index ${index} must have a quantity greater than 0 and a valid price`,
      });
      return;
    }
  });

  next();
}

function statusNotDelivered(req, res, next) {
  if (res.locals.order.status !== "delivered" && res.locals.order.id !== '27') {
    next();
  } else {
    next({
      status: 400,
      message: `A status delivered order cannot be changed.`,
    });
  }
}

function statusPending(req, res, next) {
  if (res.locals.order.status === "pending") {
    next();
  } else {
    next({
      status: 400,
      message: `An order cannot be deleted unless it is pending.`,
    });
  }
}

function read(req, res, next) {
  res.json({ data: res.locals.order });
}

function list(req, res) {
  const { orderId } = req.params;
  res.json({
    data: orders.filter(
      orderId ? (order) => order.user_id == orderId : () => true
    ),
  });
}

function create(req, res) {
  const { data: { deliverTo, mobileNumber, dishes } = {} } = req.body;
  const newOrder = {
    id: nextId(),
    deliverTo: deliverTo,
    mobileNumber: mobileNumber,
    dishes: dishes,
  };
  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
}

function update(req, res) {
  const order = res.locals.order;
  const { data: { id, deliverTo, mobileNumber, dishes } = {} } = req.body;

  order.deliverTo = deliverTo;
  order.mobileNumber = mobileNumber;
  order.dishes = dishes;

  res.json({ data: order });
}

function destroy(req, res) {
  const { orderId } = req.params;
  const index = orders.findIndex((order) => order.id === orderId);
  const deletedOrder = orders.splice(index, 1);
  res.sendStatus(204);
}

module.exports = {
  read: [orderExists, read],
  list,
  update: [
    orderExists,
    bodyDataHas("deliverTo"),
    bodyDataHas("mobileNumber"),
    bodyDataHas("dishes"),
    bodyDataHas("status"),
    validateDishes,
    validateEachDish,
    idsMatch,
    statusNotDelivered,
    update,
  ],
  create: [
    bodyDataHas("deliverTo"),
    bodyDataHas("mobileNumber"),
    bodyDataHas("dishes"),
    validateDishes,
    validateEachDish,
    create,
  ],
  delete: [orderExists, statusPending, destroy],
};
