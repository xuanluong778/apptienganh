export default function VocabularyGrid({ items, renderItem }) {
  return (
    <div className="beego-vocab-grid">
      {items.map((item, index) => renderItem(item, index))}
    </div>
  );
}
