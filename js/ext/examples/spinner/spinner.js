Ext.onReady(function(){var a=new Ext.FormPanel({labelWidth:40,frame:!0,title:"Simple Form",bodyStyle:"padding:5px 5px 0",width:210,defaults:{width:135},defaultType:"textfield",items:[new Ext.ux.form.SpinnerField({fieldLabel:"Age",name:"age"}),{xtype:"spinnerfield",fieldLabel:"Test",name:"test",minValue:0,maxValue:100,allowDecimals:!0,decimalPrecision:1,incrementValue:.4,alternateIncrementValue:2.1,accelerate:!0}]});a.render("form-ct")});