import React from "react";

interface AdminIconProps {
  name: string;
  size?: number;
  opacity?: number;
  style?: React.CSSProperties;
}

const AdminIcon: React.FC<AdminIconProps> = ({ name, size = 20, opacity = 1, style }) => (
  <img
    src={`/icons/admin/${name}.svg`}
    width={size}
    height={size}
    alt=""
    style={{ display: "block", opacity, pointerEvents: "none", ...style }}
  />
);

export default AdminIcon;
