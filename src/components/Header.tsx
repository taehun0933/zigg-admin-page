interface HeaderProps {
  title: string;
  subTitle: string;
}

const Header: React.FC<HeaderProps> = ({ subTitle, title }) => {
  return (
    <header className="bg-gray-700 text-white text-center py-16 px-4">
      <h1 className="text-4xl font-bold mb-4">{title}</h1>
      <p>{subTitle}</p>
    </header>
  );
};

export default Header;
