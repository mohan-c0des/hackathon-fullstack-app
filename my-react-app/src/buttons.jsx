function UpperComponent(){
  return(
  <div className="upper">
    <input className='search-input' placeholder="search " size={50} ></input>
    <div className="domain-buttons">
      <button onClick={fetch("http://127.0.0.1:8000/")}>but1</button>
      <button>but2</button>
      <button>but3</button>
    </div>
  </div>);
}
export default UpperComponent;