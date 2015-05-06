// This is a manifest file that'll be compiled into hive.js, which will include all the files
// listed below. Require this in the host application via *require hive* and you are ready to go.
//
// It's not advisable to add code directly here, but if you do, it'll appear at the bottom of the
// compiled file.
//
//= require jquery
//= require jquery_ujs
//= require jquery.plugin
//= require hive/modernizr
//= require hive/webflow
//= require devise_avatarable
//= require devise_attributable
//= require hive/validations
//= require_self

$(function() {
  // Move form error messages to the top of our dialog window so they are in the
  // same location as flash messages.
  $('.alert.form-error').prependTo('.dialog');
});
