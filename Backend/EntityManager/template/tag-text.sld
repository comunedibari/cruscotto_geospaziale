<TextSymbolizer>
  <Label>
    ${label}
  </Label>
  <Font>
    <CssParameter name="font-family">sans-serif</CssParameter>
    <CssParameter name="font-size">${fontSize}</CssParameter>
  </Font>
  <Fill>
    <CssParameter name="fill">${textColor}</CssParameter>
  </Fill>
  <Halo>
    <Fill>
      <CssParameter name="fill">${textBackColor}</CssParameter>
    </Fill>
  </Halo>
  <LabelPlacement>
    <PointPlacement>
      <AnchorPoint>
        <AnchorPointX>0.5</AnchorPointX>
        <AnchorPointY>0.5</AnchorPointY>
      </AnchorPoint>
    </PointPlacement>
  </LabelPlacement>
  <VendorOption name="autoWrap">100</VendorOption>
  <VendorOption name="maxDisplacement">50</VendorOption>
</TextSymbolizer>
