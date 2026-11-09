import {Link} from 'react-router-dom';
import {useShop} from '../lib/store';
import {useFavorites} from '../lib/favorites';
import {ProductCard,Empty} from '../components/ui';
export default function Wishlist(){
const catalog=useShop(s=>s.catalog),ids=useFavorites(s=>s.ids),clear=useFavorites(s=>s.clear);
const products=catalog.products.filter(p=>ids.includes(p.id));
const brands=Object.fromEntries(catalog.brands.map(b=>[b.id,b.name]));
return <><div className="page-title"><h1>Wishlist</h1><span className="muted">{products.length} saved</span></div>{products.length?<><div className="wishlist-tools"><button className="btn" onClick={clear}>Clear wishlist</button><Link className="btn btn-primary" to="/products">Continue shopping</Link></div><div className="grid">{products.map(p=><ProductCard key={p.id} p={p} brand={brands[p.brand_id]} currency={catalog.shop.currency}/>)}</div></>:<Empty title="Your wishlist is empty"><Link className="btn btn-primary" to="/products">Browse products</Link></Empty>}</>;}
