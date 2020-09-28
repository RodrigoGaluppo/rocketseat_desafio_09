import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject("OrdersRepository")
    private ordersRepository: IOrdersRepository,

    @inject("ProductsRepository")
    private productsRepository: IProductsRepository,

    @inject("CustomersRepository")
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customerExists = await this.customersRepository.findById(customer_id)

    if(!customerExists){
      throw new AppError("Could not find this customer")
    }

    const ExistentProducts = await this.productsRepository.findAllById(products)

    if(!ExistentProducts.length){
      throw new AppError("could not find any products")
    }

    const ExistentProductsID = ExistentProducts.map(product => product.id)

    const checkInexistentProducts = products.filter(
      product => !ExistentProductsID.includes(product.id)
    )

    if(checkInexistentProducts.length){
      throw new AppError(`could not find product ${checkInexistentProducts[0].id}`)
    }

    const findProductsWIthQUantityAvailable = products.filter(
      product => ExistentProducts.filter(p=>p.id == product.id)[0].quantity <= product.quantity
    )

    if(findProductsWIthQUantityAvailable.length){
        throw  new AppError(`the quantity ${findProductsWIthQUantityAvailable[0].quantity}
        is not available for ${findProductsWIthQUantityAvailable}`)
    }

    const serializedProducts = products.map(product=>({
      product_id: product.id,
      quantity:product.quantity,
      price:ExistentProducts.filter(p=>p.id == product.id)[0].price
    }))

    const order = await this.ordersRepository.create({
      customer:customerExists,
      products:serializedProducts
    })

    const orderedProductsQuantity = products.map(product=>({
      id:product.id,
      quantity:ExistentProducts.filter(p=> p.id === product.id)[0].quantity - product.quantity
    }))

    await this.productsRepository.updateQuantity(orderedProductsQuantity)

    return order
  }
}

export default CreateOrderService;
